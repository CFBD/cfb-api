module.exports = (db) => {
    const getPlays = async (year, week, team, offense, defense, offenseConference, defenseConference, conference, playType, seasonType) => {
        let filter = 'WHERE g.season = $1';
        let params = [year];

        let index = 2;

        if (week) {

            filter += ` AND g.week = $${index}`;
            params.push(week);
            index++;
        }

        if (team) {
            filter += ` AND (LOWER(offense.school) = LOWER($${index}) OR LOWER(defense.school) = LOWER($${index}))`;
            params.push(team);
            index++;
        }

        if (offense) {
            filter += ` AND LOWER(offense.school) = LOWER($${index})`;
            params.push(offense);
            index++;
        }

        if (defense) {
            filter += ` AND LOWER(defense.school) = LOWER($${index})`;
            params.push(defense);
            index++;
        }

        if (offenseConference) {
            filter += ` AND LOWER(oc.abbreviation) = LOWER($${index})`;
            params.push(offenseConference);
            index++;
        }

        if (defenseConference) {
            filter += ` AND LOWER(dc.abbreviation) = LOWER($${index})`;
            params.push(defenseConference);
            index++;
        }

        if (conference) {
            filter += ` AND (LOWER(oc.abbreviation) = LOWER($${index}) OR LOWER(dc.abbreviation) = LOWER($${index}))`;
            params.push(conference);
            index++;
        }

        if (playType) {
            filter += ` AND pt.id = $${index}`;
            params.push(playType);
            index++;
        }

        if (seasonType != 'both') {
            filter += ` AND g.season_type = $${index}`;
            params.push(seasonType || 'regular');
            index++;
        }

        let plays = await db.any(`
                    SELECT  p.id,
                            offense.school as offense,
                            oc.name as offense_conference,
                            defense.school as defense,
                            dc.name as defense_conference,
                            CASE WHEN ogt.home_away = 'home' THEN offense.school ELSE defense.school END AS home,
                            CASE WHEN ogt.home_away = 'away' THEN offense.school ELSE defense.school END AS away,
                            CASE WHEN ogt.home_away = 'home' THEN p.home_score ELSE p.away_score END AS offense_score,
                            CASE WHEN dgt.home_away = 'home' THEN p.home_score ELSE p.away_score END AS defense_score,
                            g.id as game_id,
                            d.id as drive_id,
                            g.id as game_id,
                            d.drive_number,
                            p.play_number,
                            p.period,
                            p.clock,
                            CASE WHEN ogt.home_away = 'home' THEN p.home_timeouts ELSE p.away_timeouts END AS offense_timeouts,
                            CASE WHEN dgt.home_away = 'home' THEN p.home_timeouts ELSE p.away_timeouts END AS defense_timeouts,
                            p.yard_line,
                            CASE WHEN ogt.home_away = 'home' THEN (100 - p.yard_line) ELSE p.yard_line END AS yards_to_goal,
                            p.down,
                            p.distance,
                            p.scoring,
                            p.yards_gained,
                            pt.text as play_type,
                            p.play_text,
                            p.ppa,
                            p.wallclock
                    FROM game g
                        INNER JOIN drive d ON g.id = d.game_id
                        INNER JOIN play p ON d.id = p.drive_id
                        INNER JOIN team offense ON p.offense_id = offense.id
                        LEFT JOIN conference_team oct ON offense.id = oct.team_id AND oct.start_year <= g.season AND (oct.end_year >= g.season OR oct.end_year IS NULL)
                        LEFT JOIN conference oc ON oct.conference_id = oc.id
                        INNER JOIN team defense ON p.defense_id = defense.id
                        LEFT JOIN conference_team dct ON defense.id = dct.team_id AND dct.start_year <= g.season AND (dct.end_year >= g.season OR dct.end_year IS NULL)
                        LEFT JOIN conference dc ON dct.conference_id = dc.id
                        INNER JOIN game_team ogt ON ogt.game_id = g.id AND ogt.team_id = offense.id 
                        INNER JOIN game_team dgt ON dgt.game_id = g.id AND dgt.team_id = defense.id
                        INNER JOIN play_type pt ON p.play_type_id = pt.id
                    ${filter}
                    ORDER BY g.id, d.drive_number, p.play_number
            `, params);

        for (let play of plays) {
            if (!play.clock.minutes) {
                play.clock.minutes = 0;
            }

            if (!play.clock.seconds) {
                play.clock.seconds = 0;
            }
        }

        return plays;
    };

    const getPlayTypes = async () => {
        const types = await db.any(`
            SELECT id, text, abbreviation
            FROM play_type
            ORDER BY "sequence"
        `);

        return types;
    };

    const getPlayStatTypes = async () => {
        const types = await db.any(`
            SELECT id, name
            FROM play_stat_type
        `);

        return types;
    };

    const getPlayStats = async (
        year,
        week,
        team,
        gameId,
        athleteId,
        statTypeId,
        seasonType,
        conference
    ) => {
        let filters = [];
        let params = [];
        let index = 1;

        if (year) {
            filters.push(`g.season = $${index}`);
            params.push(year);
            index++;
        }

        if (week) {
            filters.push(`g.week = $${index}`);
            params.push(week);
            index++;
        }

        if (team) {
            filters.push(`LOWER(t.school) = LOWER($${index})`);
            params.push(team);
            index++;
        }

        if (gameId) {
            filters.push(`g.id = $${index}`);
            params.push(gameId);
            index++;
        }

        if (athleteId) {
            filters.push(`a.id = $${index}`);
            params.push(athleteId);
            index++;
        }

        if (statTypeId) {
            filters.push(`pst.id = $${index}`);
            params.push(statTypeId);
            index++;
        }
        
        if (seasonType != 'both') {
            filters.push(`g.season_type = $${index}`);
            params.push(seasonType || 'regular');
            index++;
        }

        if (conference) {
            filters.push(`LOWER(c.abbreviation) = LOWER($${index})`);
            params.push(conference);
            index++;
        }

        let filter = `WHERE ${filters.join(' AND ')}`;

        const results = await db.any(`
            SELECT 	g.id as game_id,
                    g.season,
                    g.week,
                    t.school AS team,
					c.name AS conference,
                    t2.school AS opponent,
                    CASE
                        WHEN gt.home_away = 'home' THEN p.home_score
                        ELSE p.away_score
                    END AS team_score,
                    CASE
                        WHEN gt2.home_away = 'home' THEN p.home_score
                        ELSE p.away_score
                    END AS opponent_score,
                    d.id AS drive_id,
                    p.id AS play_id,
                    p.period,
                    p.clock,
                    CASE
                        WHEN (gt.home_away = 'home' AND p.offense_id = t.id) OR (gt.home_away = 'away' AND p.defense_id = t.id) THEN 100 - p.yard_line
                        ELSE p.yard_line
                    END AS yards_to_goal,
                    p.down,
                    p.distance,
                    a.id AS athlete_id,
                    a.name AS athlete_name,
                    pst.name AS stat_name,
                    ps.stat
            FROM team AS t
                INNER JOIN game_team AS gt ON t.id = gt.team_id
                INNER JOIN game_team AS gt2 ON gt2.game_id = gt.game_id AND gt.id <> gt2.id
                INNER JOIN team AS t2 ON gt2.team_id = t2.id
                INNER JOIN game AS g ON gt.game_id = g.id
                INNER JOIN drive AS d ON g.id = d.game_id
                INNER JOIN play AS p ON d.id = p.drive_id
                INNER JOIN play_stat AS ps ON p.id = ps.play_id
                INNER JOIN athlete AS a ON a.id = ps.athlete_id
				INNER JOIN athlete_team AS att ON a.id = att.athlete_id AND att.start_year <= g.season AND att.end_year >= g.season AND att.team_id = t.id
                INNER JOIN play_stat_type AS pst ON ps.stat_type_id = pst.id
                INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year IS NULL OR ct.end_year >= g.season)
                INNER JOIN conference AS c ON ct.conference_id = c.id
            ${filter}
            LIMIT 2000
        `, params);

        for (let play of results) {
            if (!play.clock.minutes) {
                play.clock.minutes = 0;
            }

            if (!play.clock.seconds) {
                play.clock.seconds = 0;
            }
        }

        return results.map(r => ({
            gameId: r.game_id,
            season: r.season,
            week: r.week,
            team: r.team,
            conference: r.conference,
            opponent: r.opponent,
            teamScore: r.team_score,
            opponentScore: r.opponent_score,
            driveId: r.drive_id,
            playId: r.play_id,
            period: r.period,
            secondsRemaining: r.seconds_remaining,
            yardsToGoal: r.yards_to_goal,
            down: r.down,
            distance: r.distance,
            athleteId: r.athlete_id,
            athleteName: r.athlete_name,
            statType: r.stat_name,
            stat: r.stat
        }));
    }

    return {
        getPlays,
        getPlayTypes,
        getPlayStatTypes,
        getPlayStats
    }
}
