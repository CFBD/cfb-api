const synaptic = require('synaptic');
const gaussian = require('gaussian');
const gaussianDistro = gaussian(0, Math.pow(17, 2));

module.exports = (db) => {
    const Architect = synaptic.Architect;
    const wpNetwork = Architect.Perceptron.fromJSON(require('./wpNetwork'));
    const wpKeys = require('./wpKeys');

    const getPP = async (down, distance) => {
        let results = await db.any(`
                SELECT (100 - yard_line) AS yardline, predicted_points
                FROM ppa
                WHERE down = $1 AND distance = $2
                ORDER BY yardline
        `, [down, distance]);

        return results.map(r => ({
            yardLine: r.yardline,
            predictedPoints: r.predicted_points
        }));
    };

    const renormalizeData = (inputs) => {
        let inputMins = wpKeys.input.mins;
        let inputMaxes = wpKeys.input.maxes;
        let inputNorm = [];
        for (let i = 0; i < inputs.length; i++) {
            inputNorm.push((inputs[i] - inputMins[i]) / (inputMaxes[i] - inputMins[i]));
        }

        // datum.normalizedInput = inputNorm;

        return inputNorm;
    }

    const getWP = async (gameId, includeSpread = true) => {
        let plays = await db.any(`
        SELECT 	g.id,
		        p.id AS play_id,
                p.play_text,
                home_team.id AS home_id,
                home_team.school AS home,
                away_team.id AS away_id,
                away_team.school AS away,
                COALESCE(gl.spread, 0) AS spread,
                CASE 
                    WHEN home.team_id = p.offense_id AND p.scoring = false THEN true 
                    WHEN home.team_id = p.defense_id AND p.scoring = true THEN true
                    ELSE false 
                END AS has_ball,
                p.home_score,
                p.away_score,
                (((4 - p.period) * 60 * 15) + EXTRACT(epoch FROM p.clock)) as time_remaining,
                CASE
                    WHEN (home.team_id = p.offense_id) OR (away.team_id = p.defense_id) THEN (100 - p.yard_line)
                    ELSE p.yard_line 
                END AS yard_line,
                p.down,
                p.distance,
                home.winner,
                ROW_NUMBER() OVER(ORDER BY p.period, p.clock DESC, p.id) AS play_number
            FROM game AS g
            INNER JOIN game_team AS home ON g.id = home.game_id AND home.home_away = 'home'
            INNER JOIN team AS home_team ON home.team_id = home_team.id
            INNER JOIN game_team AS away ON g.id = away.game_id AND away.home_away = 'away'
            INNER JOIN team AS away_team ON away.team_id = away_team.id
            INNER JOIN drive AS d ON g.id = d.game_id
            INNER JOIN play AS p 
                ON d.id = p.drive_id 
                    AND p.play_type_id NOT IN (12,13,15,16,21,43,53,56,57,61,62,65,66,999,78)
                    AND p.period < 5
                    AND p.yard_line <= 99 
                    AND p.yard_line >= 1
                    AND p.down > 0 
                    AND p.down < 5 
                    AND p.distance <= CASE WHEN (home.team_id = p.offense_id) OR (away.team_id = p.defense_id) THEN (100 - p.yard_line) ELSE p.yard_line END
                    AND p.distance >= 1
            LEFT JOIN game_lines AS gl ON g.id = gl.game_id AND gl.lines_provider_id = 1004
        WHERE g.id = $1
        ORDER BY p.period, p.clock DESC
    `, [gameId]);

        if (plays && plays.length) {
            let first = plays[0];
            plays = [{
                    gameId: first.gameId,
                    play_id: 0,
                    play_text: 'Game start',
                    home_id: first.home_id,
                    home: first.home,
                    away_id: first.away_id,
                    away: first.away,
                    spread: first.spread,
                    has_ball: false,
                    home_score: 0,
                    away_score: 0,
                    time_remaining: 3600,
                    yard_line: 65,
                    down: 1,
                    distance: 10,
                    play_number: 0
                },
                ...plays
            ];

            for (let play of plays) {
                play.spread *= (play.time_remaining / 3600) * (includeSpread == true || includeSpread == 'true' ? 1 : 0);
            }

            for (let i = 0; i < plays.length; i++) {
                let play = plays[i];
                let playInputs = [
                    parseInt(play.spread), // spread
                    play.has_ball ? 1 : 0, // possession
                    parseInt(play.home_score), // home points
                    parseInt(play.away_score), // opp_points
                    parseInt(play.time_remaining), // seconds left
                    parseInt(play.yard_line), // yards to goal
                    parseInt(play.down), // down
                    parseInt(play.distance) // distance
                ];
                play.homeWinProb = wpNetwork.activate(renormalizeData(playInputs))[0];
            }

            let last = plays[plays.length - 1];
            if (last.time_remaining == 0) {
                last.homeWinProb = last.winner ? 1 : 0;
            } else {
                plays = [
                    ...plays,
                    {
                        gameId: last.gameId,
                        play_id: 0,
                        play_text: 'Game ended',
                        home_id: last.home_id,
                        home: last.home,
                        away_id: last.away_id,
                        away: last.away,
                        spread: last.spread,
                        has_ball: last.has_ball,
                        home_score: last.home_score,
                        away_score: last.away_score,
                        time_remaining: 0,
                        yard_line: 65,
                        down: 0,
                        distance: 0,
                        homeWinProb: last.winner ? 1 : 0,
                        play_number: (parseInt(last.play_number) + 1)
                    }
                ]
            }
        }

        return plays.map(p => ({
            gameId: p.gameId,
            playId: p.play_id,
            playText: p.play_text,
            homeId: p.home_id,
            home: p.home,
            awayId: p.away_id,
            away: p.away,
            spread: p.spread,
            homeBall: p.has_ball,
            homeScore: p.home_score,
            awayScore: p.away_score,
            timeRemaining: p.time_remaining,
            yardLine: p.yard_line,
            down: p.down,
            distance: p.distance,
            homeWinProb: p.homeWinProb,
            playNumber: p.play_number
        }));
    }

    const getPPAByTeam = async (year, team, conference, excludeGarbageTime) => {
        let filter = 'WHERE';
        let params = [];
        let index = 1;

        if (year) {
            filter += ` g.season = $${index}`;
            params.push(year);
            index++;
        }

        if (team) {
            if (params.length) {
                filter += ' AND';
            }
            filter += ` LOWER(t.school) = LOWER($${index})`;
            params.push(team);
            index++;
        }

        if (conference) {
            if (params.length) {
                filter += ' AND';
            }
            filter += ` LOWER(c.abbreviation) = LOWER($${index})`;
            params.push(conference);
            index++;
        }

        if (excludeGarbageTime == 'true') {
            filter += ` AND (
                p.period = 1
                    OR (p.period = 2 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 38)
                    OR (p.period = 3 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 28)
                    OR (p.period = 4 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 22)
                    OR (p.period = 2 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 45)
                    OR (p.period = 3 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 35)
                    OR (p.period = 4 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 28)
            )
            `;
        }

        const results = await db.any(`
        SELECT 	g.season,
                t.school,
                c.name AS conference,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id) AS offense_ppa,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.play_type_id IN (3,4,6,7,24,26,36,51,67)) AS passing_offense_ppa,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.play_type_id IN (5,9,29,39,68)) AS rushing_offense_ppa,
                SUM(p.ppa) FILTER(WHERE p.offense_id = t.id) AS offense_ppa_cum,
                SUM(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.play_type_id IN (3,4,6,7,24,26,36,51,67)) AS passing_offense_ppa_cum,
                SUM(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.play_type_id IN (5,9,29,39,68)) AS rushing_offense_ppa_cum,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.down = 1) AS first_offense_ppa,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.down = 2) AS second_offense_ppa,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.down = 3) AS third_offense_ppa,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id) AS defense_ppa,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.play_type_id IN (3,4,6,7,24,26,36,51,67)) AS passing_defense_ppa,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.play_type_id IN (5,9,29,39,68)) AS rushing_defense_ppa,
                SUM(p.ppa) FILTER(WHERE p.defense_id = t.id) AS defense_ppa_cum,
                SUM(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.play_type_id IN (3,4,6,7,24,26,36,51,67)) AS passing_defense_ppa_cum,
                SUM(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.play_type_id IN (5,9,29,39,68)) AS rushing_defense_ppa_cum,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.down = 1) AS first_defense_ppa,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.down = 2) AS second_defense_ppa,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.down = 3) AS third_defense_ppa
        FROM game AS g
            INNER JOIN drive AS d ON g.id = d.game_id
            INNER JOIN play AS p ON d.id = p.drive_id
            INNER JOIN team AS t ON p.offense_id = t.id OR p.defense_id = t.id AND p.ppa IS NOT NULL
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year >= g.season OR ct.end_year IS NULL)
            INNER JOIN conference AS c ON ct.conference_id = c.id
        ${filter}
        GROUP BY g.season, t.school, c.name
        ORDER BY g.season DESC, t.school
        `, params);

        return results.map(r => ({
            season: r.season,
            conference: r.conference,
            team: r.school,
            offense: {
                overall: r.offense_ppa,
                passing: r.passing_offense_ppa,
                rushing: r.rushing_offense_ppa,
                firstDown: r.first_offense_ppa,
                secondDown: r.second_offense_ppa,
                thirdDown: r.third_offense_ppa,
                cumulative: {
                    total: r.offense_ppa_cum,
                    passing: r.passing_offense_ppa_cum,
                    rushing: r.rushing_offense_ppa_cum
                }
            },
            defense: {
                overall: r.defense_ppa,
                passing: r.passing_defense_ppa,
                rushing: r.rushing_defense_ppa,
                firstDown: r.first_defense_ppa,
                secondDown: r.second_defense_ppa,
                thirdDown: r.third_defense_ppa,
                cumulative: {
                    total: r.defense_ppa_cum,
                    passing: r.passing_defense_ppa_cum,
                    rushing: r.rushing_defense_ppa_cum
                }
            }
        }));
    }

    const getPPAByGame = async (year, team, conference, week, excludeGarbageTime) => {
        let filter = 'WHERE g.season = $1';
        let params = [year];
        let index = 2;

        if (team) {
            filter += ` AND LOWER(t.school) = LOWER($${index})`;
            params.push(team);
            index++
        }

        if (conference) {
            filter += ` AND LOWER(c.abbreviation) = LOWER($${index})`;
            params.push(conference);
            index++;
        }

        if (week) {
            filter += ` AND g.week = $${index}`;
            params.push(week);
            index++;
        }

        if (excludeGarbageTime == 'true') {
            filter += ` AND (
                p.period = 1
                    OR (p.period = 2 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 38)
                    OR (p.period = 3 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 28)
                    OR (p.period = 4 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 22)
                    OR (p.period = 2 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 45)
                    OR (p.period = 3 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 35)
                    OR (p.period = 4 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 28)
            )
            `;
        }

        let results = await db.any(`
        SELECT 	g.id,
                g.season,
                g.week,
                t.school,
                c.name AS conference,
                t2.school AS opponent,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id) AS offense_ppa,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.play_type_id IN (3,4,6,7,24,26,36,51,67)) AS passing_offense_ppa,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.play_type_id IN (5,9,29,39,68)) AS rushing_offense_ppa,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.down = 1) AS first_offense_ppa,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.down = 2) AS second_offense_ppa,
                AVG(p.ppa) FILTER(WHERE p.offense_id = t.id AND p.down = 3) AS third_offense_ppa,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id) AS defense_ppa,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.play_type_id IN (3,4,6,7,24,26,36,51,67)) AS passing_defense_ppa,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.play_type_id IN (5,9,29,39,68)) AS rushing_defense_ppa,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.down = 1) AS first_defense_ppa,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.down = 2) AS second_defense_ppa,
                AVG(p.ppa) FILTER(WHERE p.defense_id = t.id AND p.down = 3) AS third_defense_ppa
        FROM game AS g
            INNER JOIN drive AS d ON g.id = d.game_id
            INNER JOIN play AS p ON d.id = p.drive_id
            INNER JOIN team AS t ON (p.offense_id = t.id OR p.defense_id = t.id) AND p.ppa IS NOT NULL
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year >= g.season OR ct.end_year IS NULL)
            INNER JOIN conference AS c ON ct.conference_id = c.id
            INNER JOIN team AS t2 ON (p.offense_id = t2.id OR p.defense_id = t2.id) AND t.id <> t2.id
        ${filter}
        GROUP BY g.id, g.season, g.week, t.school, c.name, t2.school
        ORDER BY g.season DESC, g.week, t.school
        `, params);

        return results.map(r => ({
            gameId: r.id,
            season: r.season,
            week: r.week,
            conference: r.conference,
            team: r.school,
            opponent: r.opponent,
            offense: {
                overall: r.offense_ppa,
                passing: r.passing_offense_ppa,
                rushing: r.rushing_offense_ppa,
                firstDown: r.first_offense_ppa,
                secondDown: r.second_offense_ppa,
                thirdDown: r.third_offense_ppa
            },
            defense: {
                overall: r.defense_ppa,
                passing: r.passing_defense_ppa,
                rushing: r.rushing_defense_ppa,
                firstDown: r.first_defense_ppa,
                secondDown: r.second_defense_ppa,
                thirdDown: r.third_defense_ppa
            }
        }));
    };

    const getPPAByPlayerGame = async (season, week, position, school, playerId, threshold, excludeGarbageTime) => {
        let filters = [];
        let params = [];
        let index = 1;

        if (season) {
            filters.push(`g.season = $${index}`);
            params.push(season);
            index++;
        }

        if (week) {
            filters.push(`g.week = $${index}`);
            params.push(week);
            index++;
        }

        if (position) {
            filters.push(`LOWER(po.abbreviation) = LOWER($${index})`);
            params.push(position);
            index++;
        }

        if (school) {
            filters.push(`LOWER(t.school) = LOWER($${index})`);
            params.push(school);
            index++;
        }

        if (playerId) {
            filters.push(`a.id = $${index}`);
            params.push(playerId);
            index++;
        }

        let filter = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        if (!threshold) {
            threshold = 0;
        }

        if (filters.length && excludeGarbageTime == 'true') {
                filter += ` AND (
                p.period = 1
                    OR (p.period = 2 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 38)
                    OR (p.period = 3 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 28)
                    OR (p.period = 4 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 22)
                    OR (p.period = 2 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 45)
                    OR (p.period = 3 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 35)
                    OR (p.period = 4 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 28)
            )
            `;
        } else if (excludeGarbageTime == 'true') {
            filter += ` WHERE (
                p.period = 1
                    OR (p.period = 2 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 38)
                    OR (p.period = 3 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 28)
                    OR (p.period = 4 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 22)
                    OR (p.period = 2 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 45)
                    OR (p.period = 3 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 35)
                    OR (p.period = 4 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 28)
            )
            `;
        }

        params.push(threshold);

        const results = await db.any(`
            WITH plays AS (
                SELECT DISTINCT t.school,
                                g.season,
                                g.week,
                                t2.school AS opponent,
                                a.id,
                                a.name,
                                po.abbreviation AS position,
                                p.id AS play_id,
                                p.down,
                                CASE
                                    WHEN p.play_type_id IN (3,4,6,7,24,26,36,51,67) THEN 'Pass'
                                    WHEN p.play_type_id IN (5,9,29,39,68) THEN 'Rush'
                                    ELSE 'Other'
                                END AS play_type,
                                p.ppa
                FROM game AS g
                    INNER JOIN game_team AS gt ON g.id = gt.game_id
                    INNER JOIN team AS t ON gt.team_id = t.id
                    INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.end_year IS NULL
                    INNER JOIN conference AS c ON ct.conference_id = c.id
                    INNER JOIN game_team AS gt2 ON g.id = gt2.game_id AND gt.id <> gt2.id
                    INNER JOIN team AS t2 ON gt2.team_id = t2.id
                    INNER JOIN conference_team AS ct2 ON t2.id = ct2.team_id AND ct2.end_year IS NULL
                    INNER JOIN conference AS c2 ON ct2.conference_id = c2.id
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN play AS p ON d.id = p.drive_id AND p.offense_id = t.id AND p.ppa IS NOT NULL
                    INNER JOIN play_stat AS ps ON p.id = ps.play_id
                    INNER JOIN athlete AS a ON ps.athlete_id = a.id
                    INNER JOIN position AS po ON a.position_id = po.id
                ${filter}
            )
            SELECT  "name",
                    position,
                    school,
                    season,
                    week,
                    opponent,
                    ROUND(CAST(AVG(ppa) AS NUMERIC), 3) AS avg_ppa,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass') AS NUMERIC), 3) AS pass_ppa,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush') AS NUMERIC), 3) AS rush_ppa
            FROM plays
            WHERE position IN ('QB', 'RB', 'FB', 'TE', 'WR')
            GROUP BY "name", position, school, season, week, opponent
            HAVING COUNT(*) >= $${index}
            ORDER BY avg_ppa
        `, params);

        return results.map(r => ({
            season: r.season,
            week: r.week,
            name: r.name,
            position: r.position,
            team: r.school,
            opponent: r.opponent,
            averagePPA: {
                all: parseFloat(r.avg_ppa),
                pass: r.pass_ppa ? parseFloat(r.pass_ppa) : null,
                rush: r.rush_ppa ? parseFloat(r.rush_ppa) : null
            }
        }));
    };

    const getPPAByPlayerSeason = async (season, conference, position, school, playerId, threshold, excludeGarbageTime) => {
        let filters = [];
        let params = [];
        let index = 1;

        if (season) {
            filters.push(`g.season = $${index}`);
            params.push(season);
            index++;
        }

        if (conference) {
            filters.push(`LOWER(c.abbreviation) = LOWER($${index})`);
            params.push(conference);
            index++;
        }

        if (position) {
            filters.push(`LOWER(po.abbreviation) = LOWER($${index})`);
            params.push(position);
            index++;
        }

        if (school) {
            filters.push(`LOWER(t.school) = LOWER($${index})`);
            params.push(school);
            index++;
        }

        if (playerId) {
            filters.push(`a.id = $${index}`);
            params.push(playerId);
            index++;
        }

        let filter = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        if (!threshold) {
            threshold = 0;
        }

        if (filters.length && excludeGarbageTime == 'true') {
                filter += ` AND (
                p.period = 1
                    OR (p.period = 2 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 38)
                    OR (p.period = 3 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 28)
                    OR (p.period = 4 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 22)
                    OR (p.period = 2 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 45)
                    OR (p.period = 3 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 35)
                    OR (p.period = 4 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 28)
            )
            `;
        } else if (excludeGarbageTime == 'true') {
            filter += ` WHERE (
                p.period = 1
                    OR (p.period = 2 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 38)
                    OR (p.period = 3 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 28)
                    OR (p.period = 4 AND p.scoring = false AND ABS(p.home_score - p.away_score) <= 22)
                    OR (p.period = 2 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 45)
                    OR (p.period = 3 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 35)
                    OR (p.period = 4 AND p.scoring = true AND ABS(p.home_score - p.away_score) <= 28)
            )
            `;
        }

        params.push(threshold);

        const results = await db.any(`
        WITH plays AS (
            SELECT DISTINCT g.season,
                            t.school,
                            c.name AS conference,
                            a.id,
                            a.name,
                            po.abbreviation AS position,
                            p.id AS play_id,
                            p.down,
                            CASE
                                WHEN p.play_type_id IN (3,4,6,7,24,26,36,51,67) THEN 'Pass'
                                WHEN p.play_type_id IN (5,9,29,39,68) THEN 'Rush'
                                ELSE 'Other'
                            END AS play_type,
                            CASE
                                WHEN p.down = 2 AND p.distance >= 8 THEN 'passing'
                                WHEN p.down IN (3,4) AND p.distance >= 5 THEN 'passing'
                                ELSE 'standard'
                            END AS down_type,
                            p.ppa
            FROM game AS g
                INNER JOIN game_team AS gt ON g.id = gt.game_id
                INNER JOIN team AS t ON gt.team_id = t.id
                INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.end_year IS NULL
                INNER JOIN conference AS c ON ct.conference_id = c.id
                INNER JOIN drive AS d ON g.id = d.game_id
                INNER JOIN play AS p ON d.id = p.drive_id AND p.offense_id = t.id AND p.ppa IS NOT NULL
                INNER JOIN play_stat AS ps ON p.id = ps.play_id
                INNER JOIN athlete_team AS att ON ps.athlete_id = att.athlete_id AND att.team_id = t.id AND att.end_year >= g.season AND att.start_year <= g.season
                INNER JOIN athlete AS a ON att.athlete_id = a.id
                INNER JOIN position AS po ON a.position_id = po.id
            ${filter}
        )
        SELECT season,
              id,
              "name",
              position,
              school,
              conference,
              COUNT(ppa) AS countable_plays,
              ROUND(CAST(AVG(ppa) AS NUMERIC), 3) AS avg_ppa,
              ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass') AS NUMERIC), 3) AS pass_ppa,
              ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush') AS NUMERIC), 3) AS rush_ppa,
              ROUND(CAST(AVG(ppa) FILTER(WHERE down = 1) AS NUMERIC), 3) AS first_down_ppa,
              ROUND(CAST(AVG(ppa) FILTER(WHERE down = 2) AS NUMERIC), 3) AS second_down_ppa,
              ROUND(CAST(AVG(ppa) FILTER(WHERE down = 3) AS NUMERIC), 3) AS third_down_ppa,
              ROUND(CAST(AVG(ppa) FILTER(WHERE down_type = 'standard') AS NUMERIC), 3) AS standard_down_ppa,
              ROUND(CAST(AVG(ppa) FILTER(WHERE down_type = 'passing') AS NUMERIC), 3) AS passing_down_ppa,
              ROUND(CAST(SUM(ppa) AS NUMERIC), 3) AS total_ppa,
              ROUND(CAST(SUM(ppa) FILTER(WHERE play_type = 'Pass') AS NUMERIC), 3) AS total_pass_ppa,
              ROUND(CAST(SUM(ppa) FILTER(WHERE play_type = 'Rush') AS NUMERIC), 3) AS total_rush_ppa,
              ROUND(CAST(SUM(ppa) FILTER(WHERE down = 1) AS NUMERIC), 3) AS total_first_down_ppa,
              ROUND(CAST(SUM(ppa) FILTER(WHERE down = 2) AS NUMERIC), 3) AS total_second_down_ppa,
              ROUND(CAST(SUM(ppa) FILTER(WHERE down = 3) AS NUMERIC), 3) AS total_third_down_ppa,
              ROUND(CAST(SUM(ppa) FILTER(WHERE down_type = 'standard') AS NUMERIC), 3) AS total_standard_down_ppa,
              ROUND(CAST(SUM(ppa) FILTER(WHERE down_type = 'passing') AS NUMERIC), 3) AS total_passing_down_ppa
        FROM plays
        WHERE position IN ('QB', 'RB', 'FB', 'TE', 'WR')
        GROUP BY season, id, "name", position, school, conference
        HAVING COUNT(*) >= $${index}
        ORDER BY avg_ppa
        `, params);

        return results.map(r => ({
            season: r.season,
            id: r.id,
            name: r.name,
            position: r.position,
            team: r.school,
            conference: r.conference,
            countablePlays: parseInt(r.countable_plays),
            averagePPA: {
                all: parseFloat(r.avg_ppa),
                pass: r.pass_ppa ? parseFloat(r.pass_ppa) : null,
                rush: r.rush_ppa ? parseFloat(r.rush_ppa) : null,
                firstDown: r.first_down_ppa ? parseFloat(r.first_down_ppa) : null,
                secondDown: r.second_down_ppa ? parseFloat(r.second_down_ppa) : null,
                thirdDown: r.third_down_ppa ? parseFloat(r.third_down_ppa) : null,
                standardDowns: r.standard_down_ppa ? parseFloat(r.standard_down_ppa) : null,
                passingDowns: r.passing_down_ppa ? parseFloat(r.passing_down_ppa) : null
            },
            totalPPA: {
                all: parseFloat(r.total_ppa),
                pass: r.pass_ppa ? parseFloat(r.total_pass_ppa) : null,
                rush: r.rush_ppa ? parseFloat(r.total_rush_ppa) : null,
                firstDown: r.first_down_ppa ? parseFloat(r.total_first_down_ppa) : null,
                secondDown: r.second_down_ppa ? parseFloat(r.total_second_down_ppa) : null,
                thirdDown: r.third_down_ppa ? parseFloat(r.total_third_down_ppa) : null,
                standardDowns: r.standard_down_ppa ? parseFloat(r.total_standard_down_ppa) : null,
                passingDowns: r.passing_down_ppa ? parseFloat(r.total_passing_down_ppa) : null
            }
        }));
    };

    const getPregameWP = async (season, week, team, seasonType) => {
        let filters = [];
        let params = [];
        let index = 1;

        if (season) {
            filters.push(`g.season = $${index}`);
            params.push(season);
            index++;
        }

        if (week) {
            filters.push(`g.week = $${index}`);
            params.push(week);
            index++;
        }

        if (team) {
            filters.push(`(LOWER(home.school) = LOWER($${index}) OR LOWER(away.school) = LOWER($${index}))`);
            params.push(team);
            index++;
        }

        seasonType = seasonType || 'regular';
        filters.push(`g.season_type = $${index}`);
        params.push(seasonType);

        let filter = filters.join(' AND ')

        let results = await db.any(`
            SELECT g.id, g.season, g.season_type, g.week, home.school AS home, away.school AS away, COALESCE(gl.spread, gl2.spread) AS spread
            FROM game AS g
                INNER JOIN game_team AS gt ON gt.game_id = g.id AND gt.home_away = 'home'
                INNER JOIN team AS home ON gt.team_id = home.id
                INNER JOIN game_team AS gt2 ON gt2.game_id = g.id AND gt2.home_away = 'away'
                INNER JOIN team AS away ON gt2.team_id = away.id
                LEFT JOIN game_lines AS gl ON gl.game_id = g.id AND gl.lines_provider_id = 1004
                LEFT JOIN game_lines AS gl2 ON gl2.game_id = g.id AND gl2.lines_provider_id = 999999
            WHERE (gl.spread IS NOT NULL OR gl2.spread IS NOT NULL) AND ${filter}
            ORDER BY g.season, g.week, home.school
            LIMIT 1000
        `, params);

        return results.map(r => ({
            season: r.season,
            seasonType: r.season_type,
            week: r.week,
            gameId: r.id,
            homeTeam: r.home,
            awayTeam: r.away,
            spread: parseFloat(r.spread),
            homeWinProb: Math.round(gaussianDistro.cdf(r.spread * -1) * 1000) / 1000
        }));
    };

    return {
        getPP,
        getWP,
        getPPAByTeam,
        getPPAByGame,
        getPPAByPlayerGame,
        getPPAByPlayerSeason,
        getPregameWP
    }
}
