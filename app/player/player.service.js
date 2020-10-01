module.exports = (db) => {

    const playerSearch = async (year, school, position, searchTerm) => {
        let filter = 'WHERE att.start_year <= $1 AND att.end_year >= $1';
        let params = [year ? year : 2019];
        let index = 2;

        if (school) {
            filter += ` AND LOWER(t.school) = LOWER($${index})`;
            params.push(school);
            index++;
        }

        if (position) {
            filter += ` AND LOWER(p.abbreviation) = LOWER($${index})`;
            params.push(position);
            index++;
        }

        filter += ` AND LOWER(a.name) LIKE LOWER('%$${index}:value%')`;
        params.push(searchTerm);
        index++;

        const results = await db.any(`
        SELECT DISTINCT a.id, t.school, a.name, a.first_name, a.last_name, a.weight, a.height, a.jersey, p.abbreviation AS "position", h.city || ', ' || h.state AS hometown, '#' || t.color AS color, '#' || t.alt_color AS alt_color
        FROM athlete AS a
            INNER JOIN athlete_team AS att ON a.id = att.athlete_id
            INNER JOIN team AS t ON att.team_id = t.id
            INNER JOIN "position" AS p ON a.position_id = p.id
            INNER JOIN hometown AS h ON a.hometown_id = h.id
        ${filter}
        ORDER BY a.name
        LIMIT 100
        `, params);

        return results.map(r => ({
            id: r.id,
            team: r.school,
            name: r.name,
            firstName: r.first_name,
            lastName: r.last_name,
            weight: r.weight,
            height: r.height,
            jersey: r.jersey,
            position: r.position,
            hometown: r.hometown,
            teamColor: r.color,
            teamColorSecondary: r.alt_color
        }));
    };

    const getMeanPassingChartData = async (id, rollingPlays, year) => {
        let season = year ? year : 2019;
        const condition = rollingPlays ? `p2.row_num <= p1.row_num AND (p2.row_num + ${rollingPlays}) > p1.row_num` : 'p2.row_num <= p1.row_num';

        const results = await db.any(`
            WITH plays AS (
                SELECT a.id, a.name, t.school, p.ppa, ROW_NUMBER() OVER(PARTITION BY a.name, t.school ORDER BY g.season, g.week, p.period, p.clock DESC, d.id, p.id) AS row_num
                FROM game AS g
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN play AS p ON d.id = p.drive_id AND p.ppa IS NOT NULL AND p.play_type_id IN (3,4,6,7,24,26,36,51,67)
                    INNER JOIN play_stat AS ps ON p.id = ps.play_id
                    INNER JOIN athlete AS a ON ps.athlete_id = a.id
                    INNER JOIN team AS t ON p.offense_id = t.id
                    INNER JOIN conference_team AS ct ON ct.team_id = t.id AND ct.end_year IS NULL
                    INNER JOIN position AS po ON a.position_id = po.id AND po.abbreviation = 'QB'
                WHERE g.season = $2 AND a.id = $1
            ), grouped AS (
                SELECT p1.row_num, p2.ppa
                FROM plays AS p1
                    INNER JOIN plays AS p2 ON ${condition}
            )
            SELECT row_num, AVG(ppa) AS avg_ppa
            FROM grouped
            GROUP BY row_num
            ORDER BY row_num
        `, [id, season]);

        return results.map(r => ({ playNumber: parseInt(r.row_num), avgPPA: r.avg_ppa }));
    };

    const getPlayerUsage = async (season, conference, position, school, playerId, excludeGarbageTime) => {
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

        const results = await db.any(`
            WITH plays AS (
                SELECT DISTINCT g.season,
                                t.id AS team_id,
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
                                CASE
                                    WHEN p.period = 2 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 38 THEN true
                                    WHEN p.period = 3 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 28 THEN true
                                    WHEN p.period = 4 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 22 THEN true
                                    WHEN p.period = 2 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 45 THEN true
                                    WHEN p.period = 3 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 35 THEN true
                                    WHEN p.period = 4 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 29 THEN true
                                    ELSE false
                                END AS garbage_time,
                                p.ppa
                FROM game AS g
                    INNER JOIN game_team AS gt ON g.id = gt.game_id
                    INNER JOIN team AS t ON gt.team_id = t.id
                    INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.end_year IS NULL
                    INNER JOIN conference AS c ON ct.conference_id = c.id
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN play AS p ON d.id = p.drive_id AND p.offense_id = t.id AND p.ppa IS NOT NULL
                    INNER JOIN play_stat AS ps ON p.id = ps.play_id
                    INNER JOIN athlete AS a ON ps.athlete_id = a.id
                    INNER JOIN athlete_team AS att ON a.id = att.athlete_id AND att.start_year <= g.season AND att.end_year >= g.season AND att.team_id = t.id
                    INNER JOIN position AS po ON a.position_id = po.id
                ${filter}
            ), teams AS (
                SELECT 	g.season,
                        t.id,
                        t.school,
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
						CASE
							WHEN p.period = 2 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 38 THEN true
							WHEN p.period = 3 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 28 THEN true
							WHEN p.period = 4 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 22 THEN true
							WHEN p.period = 2 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 45 THEN true
							WHEN p.period = 3 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 35 THEN true
							WHEN p.period = 4 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 29 THEN true
							ELSE false
						END AS garbage_time,
                        p.ppa
                FROM game AS g
                    INNER JOIN game_team AS gt ON g.id = gt.game_id
                    INNER JOIN team AS t ON gt.team_id = t.id
                    INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.end_year IS NULL
                    INNER JOIN conference AS c ON ct.conference_id = c.id
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN play AS p ON d.id = p.drive_id AND p.offense_id = t.id AND p.ppa IS NOT NULL
                WHERE g.season = $1
            ), team_counts AS (
                SELECT 	season,
                        id,
                        school,
                        COUNT(*) AS plays,
                        COUNT(*) FILTER(WHERE play_type = 'Rush') AS rush,
                        COUNT(*) FILTER(WHERE play_type = 'Pass') AS pass,
                        COUNT(*) FILTER(WHERE down = 1) AS first_downs,
                        COUNT(*) FILTER(WHERE down = 2) AS second_downs,
                        COUNT(*) FILTER(WHERE down = 3) AS third_downs,
                        COUNT(*) FILTER(WHERE down_type = 'standard') AS standard_downs,
                        COUNT(*) FILTER(WHERE down_type = 'passing') AS passing_downs
                FROM teams
                ${excludeGarbageTime ? 'WHERE garbage_time = false' : ''}
                GROUP BY season, id, school
            )
            SELECT p.season,
                p.id,
                p."name",
                p.position,
                p.school,
                p.conference,
                ROUND(CAST(CAST(COUNT(p.ppa) AS NUMERIC) / t.plays AS NUMERIC), 4) AS overall_usage,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.play_type = 'Pass') AS NUMERIC) / t.pass AS NUMERIC), 4) AS pass_usage,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.play_type = 'Rush') AS NUMERIC) / t.rush AS NUMERIC), 4) AS rush_usage,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.down = 1) AS NUMERIC) / t.first_downs AS NUMERIC), 4) AS first_down_usage,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.down = 2) AS NUMERIC) / t.second_downs AS NUMERIC), 3) AS second_down_usage,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.down = 3) AS NUMERIC) / t.third_downs AS NUMERIC), 3) AS third_down_usage,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.down_type = 'standard') AS NUMERIC) / t.standard_downs AS NUMERIC), 3) AS standard_down_usage,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.down_type = 'passing') AS NUMERIC) / t.passing_downs AS NUMERIC), 3) AS passing_down_usage
            FROM plays AS p
                INNER JOIN team_counts AS t ON p.team_id = t.id
            WHERE position IN ('QB', 'RB', 'FB', 'TE', 'WR') ${excludeGarbageTime ? 'AND p.garbage_time = false' : ''}
            GROUP BY p.season, p.id, p."name", p.position, p.school, p.conference, t.plays, t.pass, t.rush, t.first_downs, t.second_downs, t.third_downs, t.standard_downs, t.passing_downs
            ORDER BY overall_usage DESC
        `, params);

        return results.map(r => ({
            season: r.season,
            id: r.id,
            name: r.name,
            position: r.position,
            team: r.school,
            conference: r.conference,
            usage: {
                overall: parseFloat(r.overall_usage),
                pass: parseFloat(r.pass_usage),
                rush: parseFloat(r.rush_usage),
                firstDown: parseFloat(r.first_down_usage),
                secondDown: parseFloat(r.second_down_usage),
                thirdDown: parseFloat(r.third_down_usage),
                standardDowns: parseFloat(r.standard_down_usage),
                passingDowns: parseFloat(r.passing_down_usage)
            }
        }));
    };

    const getReturningProduction = async (year, team, conference) => {
        let filters = [];
        let params = [];
        let index = 1;

        if (year) {
            filters.push(`g.season = $${index}`);
            params.push(year - 1);
            index ++;
        }

        if (team) {
            filters.push(`LOWER(t.school) = LOWER($${index})`);
            params.push(team);
            index ++;
        }

        if (conference) {
            filters.push(`LOWER(c.abbreviation) = LOWER($${index})`);
            params.push(conference);
            index ++;
        }

        let filter = `WHERE ps.stat_type_id IN (1,2,4,5,7,11,20) AND ${filters.join(' AND ')}`;

        let results = await db.any(`
        SELECT  g.season + 1 AS season,
                t.school,
                c.name AS conference,
                ROUND(SUM(p.ppa)) AS ppa,
                ROUND(SUM(p.ppa) FILTER(WHERE att.end_year > g.season), 1) AS returning_ppa,
                ROUND(SUM(p.ppa) FILTER(WHERE ps.stat_type_id IN (1,4,11,20)), 1) AS pass_ppa,
                ROUND(SUM(p.ppa) FILTER(WHERE ps.stat_type_id IN (1,4,11,20) AND att.end_year > g.season), 1) AS returning_pass_ppa,
                ROUND(SUM(p.ppa) FILTER(WHERE ps.stat_type_id IN (2,5)), 1) AS receiving_ppa,
                ROUND(SUM(p.ppa) FILTER(WHERE ps.stat_type_id IN (2,5) AND att.end_year > g.season), 1) AS returning_receiving_ppa,
                ROUND(SUM(p.ppa) FILTER(WHERE ps.stat_type_id IN (7)), 1) AS rush_ppa,
                ROUND(SUM(p.ppa) FILTER(WHERE ps.stat_type_id IN (7) AND att.end_year > g.season), 1) AS returning_rush_ppa,
                ROUND(AVG(CASE WHEN att.end_year > g.season THEN 1 ELSE 0 END), 3) AS returning_usage,
                ROUND(AVG(CASE WHEN att.end_year > g.season THEN 1 ELSE 0 END) FILTER(WHERE ps.stat_type_id IN (1,4,11,20)), 3) AS returning_pass_usage,
                ROUND(AVG(CASE WHEN att.end_year > g.season THEN 1 ELSE 0 END) FILTER(WHERE ps.stat_type_id IN (2,5)), 3) AS returning_receiving_usage,
                ROUND(AVG(CASE WHEN att.end_year > g.season THEN 1 ELSE 0 END) FILTER(WHERE ps.stat_type_id IN (7)), 3) AS returning_rush_usage
        FROM game AS g 
            INNER JOIN drive AS d ON g.id = d.game_id
            INNER JOIN play AS p ON d.id = p.drive_id
            INNER JOIN play_stat AS ps ON p.id = ps.play_id
            INNER JOIN athlete_team AS att ON ps.athlete_id = att.athlete_id
            INNER JOIN team AS t ON att.team_id = t.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year IS NULL OR ct.end_year >= g.season)
            INNER JOIN conference AS c ON ct.conference_id = c.id
        ${filter}
        GROUP BY g.season, t.school, c.name
        `, params);

        return results.map((r) => ({
            season: parseInt(r.season),
            team: r.school,
            conference: r.conference,
            totalPPA: parseFloat(r.returning_ppa),
            totalPassingPPA: parseFloat(r.returning_pass_ppa),
            totalReceivingPPA: parseFloat(r.returning_receiving_ppa),
            totalRushingPPA: parseFloat(r.returning_rush_ppa),
            percentPPA: Math.round(r.returning_ppa * 1000 / r.ppa) / 1000,
            percentPassingPPA: Math.round(r.returning_pass_ppa * 1000 / r.pass_ppa) / 1000,
            percentReceivingPPA: Math.round(r.returning_receiving_ppa * 1000 / r.receiving_ppa) / 1000,
            percentRushingPPA: Math.round(r.returning_rush_ppa * 1000 / r.rush_ppa) / 1000,
            usage: parseFloat(r.returning_usage),
            passingUsage: parseFloat(r.returning_pass_usage),
            receivingUsage: parseFloat(r.returning_receiving_usage),
            rushingUsage: parseFloat(r.returning_rush_usage)
        }));
    };

    const getSeasonStats = async(year, conference, team, startWeek, endWeek, seasonType, category) => {
        let filter = 'g.season = $1';
        let params = [year];
        let index = 2;

        if (conference) {
            filter += ` AND LOWER(c.abbreviation) = LOWER($${index})`;
            params.push(conference);
            index++;
        }

        if (team) {
            filter += ` AND LOWER(t.school) = LOWER($${index})`;
            params.push(team);
            index++;
        }

        if (startWeek) {
            filter += ` AND g.week >= $${index}`;
            params.push(startWeek);
            index++;
        }

        if (endWeek) {
            filter += ` AND g.week <= $${index}`;
            params.push(endWeek);
            index++;
        }
        
        if (seasonType && seasonType.toLowerCase() !== 'both') {
            filter += ` AND g.season_type = $${index}`;
            params.push(seasonType);
            index++;
        }

        if (category) {
            filter += ` AND LOWER(cat.name) = LOWER($${index})`;
            params.push(category);
            index++;
        }

        let results = await db.any(`
        SELECT 	g.season,
                a.id AS player_id,
                a.name AS player,
                t.school AS team,
                c.name AS conference,
                cat.name AS category,
                typ.name AS stat_type,
                SUM(CAST(gps.stat AS NUMERIC)) as stat
        FROM game AS g
            INNER JOIN game_team AS gt ON g.id = gt.game_id
            INNER JOIN game_player_stat AS gps ON gt.id = gps.game_team_id
            INNER JOIN athlete AS a ON gps.athlete_id = a.id
            INNER JOIN team AS t ON gt.team_id = t.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year >= g.season OR ct.end_year IS NULL)
            INNER JOIN conference AS c ON ct.conference_id = c.id
            INNER JOIN player_stat_category AS cat ON gps.category_id = cat.id
            INNER JOIN player_stat_type AS typ ON gps.type_id = typ.id
        WHERE ${filter} AND (typ.id IN (8,14,22) OR (cat.id = 1 AND typ.id = 11) OR (cat.id = 2 AND typ.id = 5) OR (cat.id = 3 AND typ.id IN (6,21)) OR (cat.id = 6 AND typ.id = 18) OR (cat.id = 7) OR (cat.id = 8 AND typ.id = 9) OR (cat.id = 9 AND typ.id = 18) OR cat.id = 10)
        GROUP BY g.season, a.id, a.name, t.school, c.name, cat.name, typ.name
        UNION
        SELECT 	g.season,
                a.id AS player_id,
                a.name AS player,
                t.school AS team,
                c.name AS conference,
                cat.name AS category,
                typ.name AS stat_type,
                MAX(CAST(gps.stat AS INT)) as stat
        FROM game AS g
            INNER JOIN game_team AS gt ON g.id = gt.game_id
            INNER JOIN game_player_stat AS gps ON gt.id = gps.game_team_id
            INNER JOIN athlete AS a ON gps.athlete_id = a.id
            INNER JOIN team AS t ON gt.team_id = t.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year >= g.season OR ct.end_year IS NULL)
            INNER JOIN conference AS c ON ct.conference_id = c.id
            INNER JOIN player_stat_category AS cat ON gps.category_id = cat.id
            INNER JOIN player_stat_type AS typ ON gps.type_id = typ.id
        WHERE ${filter} AND (typ.id = 15)
        GROUP BY g.season, a.id, a.name, t.school, c.name, cat.name, typ.name
        UNION
        SELECT 	g.season,
                a.id AS player_id,
                a.name AS player,
                t.school AS team,
                c.name AS conference,
                cat.name AS category,
                CASE
                    WHEN cat.name = 'kicking' AND typ.name = 'FG' THEN 'FGM'
                    WHEN cat.name = 'kicking' AND typ.name = 'XP' THEN 'XPM'
                    WHEN cat.name = 'passing' AND typ.name = 'C/ATT' THEN 'COMPLETIONS'
                END AS stat_type,
                SUM(CAST(split_part(gps.stat, '/', 1) AS INT)) as stat
        FROM game AS g
            INNER JOIN game_team AS gt ON g.id = gt.game_id
            INNER JOIN game_player_stat AS gps ON gt.id = gps.game_team_id
            INNER JOIN athlete AS a ON gps.athlete_id = a.id
            INNER JOIN team AS t ON gt.team_id = t.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year >= g.season OR ct.end_year IS NULL)
            INNER JOIN conference AS c ON ct.conference_id = c.id
            INNER JOIN player_stat_category AS cat ON gps.category_id = cat.id
            INNER JOIN player_stat_type AS typ ON gps.type_id = typ.id
        WHERE ${filter} AND ((cat.id = 2 AND typ.id IN (2, 10)) OR (cat.id = 9 AND typ.id = 3))
        GROUP BY g.season, a.id, a.name, t.school, c.name, cat.name, typ.name
        UNION
        SELECT 	g.season,
                a.id AS player_id,
                a.name AS player,
                t.school AS team,
                c.name AS conference,
                cat.name AS category,
                CASE
                    WHEN cat.name = 'kicking' AND typ.name = 'FG' THEN 'FGA'
                    WHEN cat.name = 'kicking' AND typ.name = 'XP' THEN 'XPA'
                    WHEN cat.name = 'passing' AND typ.name = 'C/ATT' THEN 'ATT'
                END AS stat_type,
                SUM(CAST(split_part(gps.stat, '/', 2) AS INT)) as stat
        FROM game AS g
            INNER JOIN game_team AS gt ON g.id = gt.game_id
            INNER JOIN game_player_stat AS gps ON gt.id = gps.game_team_id
            INNER JOIN athlete AS a ON gps.athlete_id = a.id
            INNER JOIN team AS t ON gt.team_id = t.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year >= g.season OR ct.end_year IS NULL)
            INNER JOIN conference AS c ON ct.conference_id = c.id
            INNER JOIN player_stat_category AS cat ON gps.category_id = cat.id
            INNER JOIN player_stat_type AS typ ON gps.type_id = typ.id
        WHERE ${filter} AND ((cat.id = 2 AND typ.id IN (2, 10)) OR (cat.id = 9 AND typ.id = 3))
        GROUP BY g.season, a.id, a.name, t.school, c.name, cat.name, typ.name
        UNION
        SELECT 	g.season,
                a.id AS player_id,
                a.name AS player,
                t.school AS team,
                c.name AS conference,
                cat.name AS category,
                CASE
                    WHEN cat.name = 'rushing' THEN 'YPC'
                    WHEN cat.name = 'receiving' THEN 'YPR'
                    WHEN cat.name = 'punting' THEN 'YPP'
                    WHEN cat.name = 'passing' THEN 'YPA'
                    WHEN cat.name IN ('kickReturns','puntReturns','interceptions') THEN 'AVG'
                END AS stat_type,
                CASE
                    WHEN cat.name IN ('rushing', 'punting', 'kickReturns', 'puntReturns','interceptions','receiving') AND SUM(CAST(gps.stat AS INT)) FILTER(WHERE typ.name IN ('CAR', 'NO', 'INT', 'REC')) = 0 THEN 0
                    WHEN cat.name IN ('rushing', 'punting', 'kickReturns', 'puntReturns','interceptions','receiving') THEN ROUND(COALESCE(SUM(CAST(gps.stat AS INT)) FILTER(WHERE typ.name = 'YDS'), 0) / SUM(CAST(gps.stat AS NUMERIC)) FILTER(WHERE typ.name IN ('CAR', 'NO', 'INT', 'REC')), 1)
                    WHEN cat.name = 'passing' AND SUM(CAST(split_part(gps.stat, '/', 2) AS INT)) FILTER(WHERE typ.id = 3) = 0 THEN 0
                    WHEN cat.name = 'passing' THEN ROUND(SUM(CAST(gps.stat AS INT)) FILTER(WHERE typ.id = 8) / SUM(CAST(split_part(gps.stat, '/', 2) AS NUMERIC)) FILTER(WHERE typ.id = 3), 1)
                END AS stat
        FROM game AS g
            INNER JOIN game_team AS gt ON g.id = gt.game_id
            INNER JOIN game_player_stat AS gps ON gt.id = gps.game_team_id
            INNER JOIN athlete AS a ON gps.athlete_id = a.id
            INNER JOIN team AS t ON gt.team_id = t.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year >= g.season OR ct.end_year IS NULL)
            INNER JOIN conference AS c ON ct.conference_id = c.id
            INNER JOIN player_stat_category AS cat ON gps.category_id = cat.id
            INNER JOIN player_stat_type AS typ ON gps.type_id = typ.id
        WHERE ${filter} AND (cat.id IN (1,3,4,5,6,8,9))
        GROUP BY g.season, a.id, a.name, t.school, c.name, cat.name
        UNION
        SELECT 	g.season,
                a.id AS player_id,
                a.name AS player,
                t.school AS team,
                c.name AS conference,
                cat.name AS category,
                CASE
                    WHEN cat.name = 'kicking' THEN 'PCT'
                    WHEN cat.name = 'passing' THEN 'PCT'
                END AS stat_type,
                CASE
                    WHEN cat.name = 'passing' AND SUM(CAST(split_part(gps.stat, '/', 2) AS INT)) FILTER(WHERE typ.id = 3) = 0 THEN 0
                    WHEN cat.name = 'passing' THEN ROUND(SUM(CAST(split_part(gps.stat, '/', 1) AS INT)) FILTER(WHERE typ.id = 3) / SUM(CAST(split_part(gps.stat, '/', 2) AS NUMERIC)) FILTER(WHERE typ.id = 3), 3)
                    WHEN cat.name = 'kicking' AND SUM(CAST(split_part(gps.stat, '/', 2) AS INT)) FILTER(WHERE typ.id = 2) = 0 THEN 0
                    WHEN cat.name = 'kicking' THEN ROUND(SUM(CAST(split_part(gps.stat, '/', 1) AS INT)) FILTER(WHERE typ.id = 2) / SUM(CAST(split_part(gps.stat, '/', 2) AS NUMERIC)) FILTER(WHERE typ.id = 2), 3)
                END AS stat
        FROM game AS g
            INNER JOIN game_team AS gt ON g.id = gt.game_id
            INNER JOIN game_player_stat AS gps ON gt.id = gps.game_team_id
            INNER JOIN athlete AS a ON gps.athlete_id = a.id
            INNER JOIN team AS t ON gt.team_id = t.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year >= g.season OR ct.end_year IS NULL)
            INNER JOIN conference AS c ON ct.conference_id = c.id
            INNER JOIN player_stat_category AS cat ON gps.category_id = cat.id
            INNER JOIN player_stat_type AS typ ON gps.type_id = typ.id
        WHERE ${filter} AND (cat.id IN (2,9))
        GROUP BY g.season, a.id, a.name, t.school, c.name, cat.name
        `, params);

        return results.map((r) => ({
            season: r.year,
            playerId: r.player_id,
            player: r.player,
            team: r.team,
            conference: r.conference,
            category: r.category,
            statType: r.stat_type,
            stat: r.stat
        }));
    };

    return {
        playerSearch,
        getMeanPassingChartData,
        getPlayerUsage,
        getReturningProduction,
        getSeasonStats
    };
};
