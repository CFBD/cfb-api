const synaptic = require('synaptic');

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

    const getWP = async (gameId) => {
        let plays = await db.any(`
        SELECT 	g.id,
		        p.id AS play_id,
                p.play_text,
                home_team.id AS home_id,
                home_team.school AS home,
                away_team.id AS away_id,
                away_team.school AS away,
                COALESCE(gl.spread, 0) AS spread,
                CASE WHEN home.team_id = p.offense_id THEN true ELSE false END AS has_ball,
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
                    AND p.play_type_id NOT IN (8,12,13,14,15,16,17,18,21,29,40,41,43,52,53,56,57,59,60,61,62,65,66,999,78)
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

    const getPPAByTeam = async (year, team, conference) => {
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

        const results = await db.any(`
        SELECT 	g.season,
                t.school,
                c.name AS conference,
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
    }

    const getPPAByGame = async (year, team, conference, week) => {
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
    }

    return {
        getPP,
        getWP,
        getPPAByTeam,
        getPPAByGame
    }
}