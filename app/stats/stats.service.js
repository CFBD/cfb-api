module.exports = (db) => {
    const getTeamStats = async (year, team, conference, startWeek, endWeek) => {
        let filter = '';
        let params = [];
        let index = 1;

        if (year) {
            filter += ` AND g.season = $${index}`;
            params.push(year);
            index++;
        }

        if (team) {
            filter += ` AND LOWER(t.school) = LOWER($${index})`;
            params.push(team);
            index++;
        }

        if (conference) {
            filter += ` AND LOWER(c.abbreviation) = LOWER($${index})`;
            params.push(conference);
            index++;
        }

        if (startWeek) {
            filter += ` AND (g.week >= $${index} OR g.season_type = 'postseason')`;
            params.push(startWeek);
            index++;
        }

        if (endWeek) {
            filter += ` AND g.week <= $${index} AND g.season_type <> 'postseason'`;
            params.push(endWeek);
            index++;
        }

        filter = filter.substring(4);

        let results = await db.any(`
        SELECT 	g.season,
                t.school,
                c.name AS conference,
                typ.name as stat_type,
                SUM(CAST(stat.stat AS INT)) as stat
        FROM game AS g
            INNER JOIN game_team AS gt ON g.id = gt.game_id
            INNER JOIN team AS t ON gt.team_id = t.id
            INNER JOIN game_team_stat AS stat ON gt.id = stat.game_team_id
            INNER JOIN team_stat_type AS typ ON stat.type_id = typ.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year IS NULL OR ct.end_year >= g.season)
            INNER JOIN conference AS c ON ct.conference_id = c.id
        WHERE typ.id IN (2,3,4,7,10,11,12,13,24,25,26,31,32,33,34,35,36,37,38) AND ${filter}
        GROUP BY g.season, t.school, typ.name, typ.id, c.name
        UNION
        SELECT 	g.season,
                t.school,
                c.name AS conference,
                CASE
                    WHEN typ.id = 5 THEN 'passCompletions'
                    WHEN typ.id = 6 THEN 'penalties'
                    WHEN typ.id = 14 THEN 'thirdDownConversions'
                    WHEN typ.id = 15 THEN 'fourthDownConversions'
                END as stat_type, SUM(CAST(split_part(stat.stat, '-', 1) AS INT)) as stat
        FROM game AS g
            INNER JOIN game_team AS gt ON g.id = gt.game_id
            INNER JOIN team AS t ON gt.team_id = t.id
            INNER JOIN game_team_stat AS stat ON gt.id = stat.game_team_id
            INNER JOIN team_stat_type AS typ ON stat.type_id = typ.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year IS NULL OR ct.end_year >= g.season)
            INNER JOIN conference AS c ON ct.conference_id = c.id
        WHERE typ.id IN (5,6,14,15) AND ${filter}
        GROUP BY g.season, t.school, typ.name, typ.id, c.name
        UNION
        SELECT 	g.season,
                t.school,
                c.name AS conference,
                CASE
                    WHEN typ.id = 5 THEN 'passAttempts'
                    WHEN typ.id = 6 THEN 'penaltyYards'
                    WHEN typ.id = 14 THEN 'thirdDowns'
                    WHEN typ.id = 15 THEN 'fourthDowns'
                END as stat_type, SUM(CAST(CASE WHEN split_part(stat.stat, '-', 2) = '' THEN '0' ELSE split_part(stat.stat, '-', 2) END AS INT)) as stat
        FROM game AS g
            INNER JOIN game_team AS gt ON g.id = gt.game_id
            INNER JOIN team AS t ON gt.team_id = t.id
            INNER JOIN game_team_stat AS stat ON gt.id = stat.game_team_id
            INNER JOIN team_stat_type AS typ ON stat.type_id = typ.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year IS NULL OR ct.end_year >= g.season)
            INNER JOIN conference AS c ON ct.conference_id = c.id
        WHERE typ.id IN (5,6,14,15) AND ${filter}
        GROUP BY g.season, t.school, typ.name, typ.id, c.name
        UNION
        SELECT 	g.season,
                t.school,
                c.name AS conference,
                typ.name AS stat_type,
                SUM(EXTRACT(epoch FROM CAST(stat.stat AS INTERVAL))) AS stat
        FROM game AS g
            INNER JOIN game_team AS gt ON g.id = gt.game_id
            INNER JOIN team AS t ON gt.team_id = t.id
            INNER JOIN game_team_stat AS stat ON gt.id = stat.game_team_id
            INNER JOIN team_stat_type AS typ ON stat.type_id = typ.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year IS NULL OR ct.end_year >= g.season)
            INNER JOIN conference AS c ON ct.conference_id = c.id
        WHERE typ.id = 8 AND ${filter}
        GROUP BY g.season, t.school, typ.name, typ.id, c.name
        UNION
        SELECT 	g.season,
                t.school,
                c.name AS conference,
                'games' as stat_type,
                COUNT(*) as stat
        FROM game AS g
            INNER JOIN game_team AS gt ON g.id = gt.game_id
            INNER JOIN team AS t ON gt.team_id = t.id
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year IS NULL OR ct.end_year >= g.season)
            INNER JOIN conference AS c ON ct.conference_id = c.id
        WHERE ${filter}
        GROUP BY g.season, t.school, c.name
        `, params);

        return results.map(r => ({
            season: r.season,
            team: r.school,
            conference: r.conference,
            statName: r.stat_type,
            statValue: r.stat
        }));
    };

    const getCategories = async () => {
        let results = await db.any(`
            SELECT name
            FROM team_stat_type
            ORDER BY name
        `);

        return results.map(r => r.name);
    }

    const getAdvancedStats = async (year, team, excludeGarbageTime, startWeek, endWeek) => {
        let filter = 'WHERE ';
        let params = [];
        let index = 1;

        if (year) {
            filter += `g.season = $${index}`;
            params.push(year);
            index++;
        }

        if (team) {
            filter += ` ${year ? 'AND ' : ''}LOWER(t.school) = LOWER($${index})`;
            params.push(team);
            index++;
        }

        if (startWeek) {
            filter += ` AND (g.week >= $${index} OR g.season_type = 'postseason')`;
            params.push(startWeek);
            index++;
        }

        if (endWeek) {
            filter += ` AND g.week <= $${index} AND g.season_type <> 'postseason'`;
            params.push(endWeek);
            index++;
        }

        const mainTask = db.any(`
        WITH plays AS (
            SELECT  g.id,
                    g.season,
                    t.school,
                    p.drive_id,
                    p.down,
                    p.distance,
                    p.yards_gained,
                    c.name AS conference,
                    CASE
                        WHEN p.offense_id = t.id THEN 'offense'
                        ELSE 'defense'
                    END AS o_d,
                    CASE
                        WHEN p.down = 2 AND p.distance >= 8 THEN 'passing'
                        WHEN p.down IN (3,4) AND p.distance >= 5 THEN 'passing'
                        ELSE 'standard'
                    END AS down_type,
                    CASE
                        WHEN p.scoring = true AND p.play_type_id NOT IN (26,36,38,39) THEN true
                        WHEN p.down = 1 AND (CAST(p.yards_gained AS NUMERIC) / p.distance) >= 0.5 THEN true
                        WHEN p.down = 2 AND (CAST(p.yards_gained AS NUMERIC) / p.distance) >= 0.7 THEN true
                        WHEN p.down IN (3,4) AND (p.yards_gained >= p.distance) THEN true
                        ELSE false
                    END AS success,
                    CASE 
                        WHEN p.play_type_id IN (3,4,6,7,24,26,36,51,67) THEN 'Pass'
                        WHEN p.play_type_id IN (5,9,29,39,68) THEN 'Rush'
                        ELSE 'Other'
                    END AS play_type,
                    CASE
                        WHEN p.period = 2 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 38 THEN true
                        WHEN p.period = 3 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 28 THEN true
                        WHEN p.period = 4 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 22 THEN true
                        WHEN p.period = 2 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 45 THEN true
                        WHEN p.period = 3 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 35 THEN true
                        WHEN p.period = 4 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 29 THEN true
                        ELSE false
                    END AS garbage_time,
                    p.ppa AS ppa
            FROM game AS g
                INNER JOIN game_team AS gt ON g.id = gt.game_id
                INNER JOIN team AS t ON gt.team_id = t.id
                INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.end_year IS NULL
                INNER JOIN conference AS c ON ct.conference_id = c.id
                INNER JOIN drive AS d ON g.id = d.game_id
                INNER JOIN play AS p ON d.id = p.drive_id AND p.ppa IS NOT NULL
            ${filter}
        )
        SELECT 	season,
                school AS team,
                conference,
                o_d AS unit,
                COUNT(ppa) AS plays,
                COUNT(DISTINCT(drive_id)) AS drives,
                AVG(ppa) AS ppa,
                AVG(ppa) FILTER(WHERE down_type = 'standard') AS standard_down_ppa,
                AVG(ppa) FILTER(WHERE down_type = 'passing') AS passing_down_ppa,
                AVG(ppa) FILTER(WHERE play_type = 'Pass') AS passing_ppa,
                AVG(ppa) FILTER(WHERE play_type = 'Rush') AS rushing_ppa,
                SUM(ppa) AS total_ppa,
                SUM(ppa) FILTER(WHERE play_type = 'Pass') AS total_passing_ppa,
                SUM(ppa) FILTER(WHERE play_type = 'Rush') AS total_rushing_ppa,
                CAST(COUNT(*) FILTER(WHERE down_type = 'standard') AS NUMERIC) / COUNT(*) AS standard_down_rate,
                CAST(COUNT(*) FILTER(WHERE down_type = 'passing') AS NUMERIC) / COUNT(*) AS passing_down_rate,
                CAST(COUNT(*) FILTER(WHERE play_type = 'Pass') AS NUMERIC) / COUNT(*) AS passing_rate,
                CAST(COUNT(*) FILTER(WHERE play_type = 'Rush') AS NUMERIC) / COUNT(*) AS rush_rate,
                CAST((COUNT(*) FILTER(WHERE success = true)) AS NUMERIC) / COUNT(*) AS success_rate,
                AVG(ppa) FILTER(WHERE success = true) AS explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND down_type = 'standard')) AS NUMERIC) / COUNT(*) FILTER(WHERE down_type = 'standard') AS standard_down_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND down_type = 'standard') AS standard_down_explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND down_type = 'passing')) AS NUMERIC) / COUNT(*) FILTER(WHERE down_type = 'passing') AS passing_down_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND down_type = 'passing') AS passing_down_explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND play_type = 'Rush')) AS NUMERIC) / COUNT(*) FILTER(WHERE play_type = 'Rush') AS rush_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND play_type = 'Rush') AS rush_explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND play_type = 'Pass')) AS NUMERIC) / COUNT(*) FILTER(WHERE play_type = 'Pass') AS pass_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND play_type = 'Pass') AS pass_explosiveness,
                CAST(COUNT(*) FILTER(WHERE distance <= 2 AND play_type = 'Rush' AND success = true) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE distance <= 2 AND play_type = 'Rush'), 0), 1) AS power_success,
                CAST(COUNT(*) FILTER(WHERE play_type = 'Rush' AND yards_gained <= 0) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1) AS stuff_rate,
                COALESCE(CAST(SUM(CASE WHEN yards_gained <= 0 THEN yards_gained * 1.2 WHEN yards_gained < 5 THEN yards_gained WHEN yards_gained < 11 THEN 4 + (yards_gained - 4) * .5 ELSE 7 END) FILTER (WHERE play_type = 'Rush') AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1), 0) AS line_yards,
                ROUND(COALESCE(CAST(SUM(CASE WHEN yards_gained <= 0 THEN yards_gained * 1.2 WHEN yards_gained < 5 THEN yards_gained WHEN yards_gained < 11 THEN 4 + (yards_gained - 4) * .5 ELSE 7 END) FILTER (WHERE play_type = 'Rush') AS NUMERIC), 0), 0) AS line_yards_sum,
                CAST(SUM(CASE WHEN yards_gained >= 10 THEN 5 ELSE (yards_gained - 5) END) FILTER(WHERE yards_gained >= 5 AND play_type = 'Rush') AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1) AS second_level_yards,
                CAST(SUM(CASE WHEN yards_gained >= 10 THEN 5 ELSE (yards_gained - 5) END) FILTER(WHERE yards_gained >= 5 AND play_type = 'Rush') AS NUMERIC) AS second_level_yards_sum,
                CAST(SUM(yards_gained - 10) FILTER(WHERE play_type = 'Rush' AND yards_gained >= 10) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1) AS open_field_yards,
                CAST(SUM(yards_gained - 10) FILTER(WHERE play_type = 'Rush' AND yards_gained >= 10) AS NUMERIC) AS open_field_yards_sum
        FROM plays
        ${excludeGarbageTime == 'true' ? 'WHERE garbage_time = false' : ''}
        GROUP BY season, school, conference, o_d
        `, params);

        const havocTask = db.any(`
            WITH havoc_events AS (
                WITH fumbles AS (
                    SELECT g.season, t.id AS team_id, COALESCE(SUM(CAST(s.stat AS NUMERIC)), 0) AS fumbles
                    FROM game AS g
                        INNER JOIN game_team AS gt ON g.id = gt.game_id
                        INNER JOIN game_team AS gt2 ON g.id = gt2.game_id AND gt.id <> gt2.id
                        INNER JOIN team AS t ON gt2.team_id = t.id
                        INNER JOIN conference_team AS ct ON ct.team_id = t.id AND ct.end_year IS NULL
                        LEFT JOIN game_player_stat AS s ON s.game_team_id = gt.id AND s.type_id = 4 AND s.category_id = 10
                    ${filter}
                    GROUP BY g.season, t.id
                )
                SELECT 	g.season,
                        t.id AS team_id,
                        COALESCE(SUM(CAST(s.stat AS NUMERIC)), 0.0) + f.fumbles AS total_havoc,
                        COALESCE(SUM(CAST(s.stat AS NUMERIC)) FILTER (WHERE s.type_id IN (16,24)), 0.0) AS db_havoc,
                        COALESCE(SUM(CAST(s.stat AS NUMERIC)) FILTER (WHERE s.type_id = 21), 0.0) + f.fumbles AS front_seven_havoc
                FROM game AS g
                    INNER JOIN game_team AS gt ON g.id = gt.game_id
                    INNER JOIN game_team AS gt2 ON g.id = gt2.game_id AND gt.id <> gt2.id
                    INNER JOIN team AS t ON gt.team_id = t.id
                    INNER JOIN conference_team AS ct ON ct.team_id = t.id AND ct.end_year IS NULL
                    INNER JOIN game_team_stat AS s ON s.game_team_id = gt.id AND s.type_id IN (16,21,24)
                    LEFT JOIN fumbles AS f ON f.team_id = t.id
                ${filter}
                GROUP BY g.season, t.id, f.fumbles
            ), plays AS (
                SELECT g.season, t.id AS team_id, COUNT(p.id) AS total
                FROM game AS g
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN play AS p ON d.id = p.drive_id AND p.ppa IS NOT NULL
                    INNER JOIN team AS t ON p.defense_id = t.id
                    INNER JOIN conference_team AS ct ON ct.team_id = t.id AND ct.end_year IS NULL
                ${filter}
                GROUP BY g.season, t.id
            )
            SELECT p.season AS season, t.school AS team, (h.total_havoc / p.total) AS total_havoc, (h.front_seven_havoc / p.total) AS front_seven_havoc, (h.db_havoc / p.total) AS db_havoc
            FROM plays AS p
                INNER JOIN havoc_events AS h ON p.team_id = h.team_id AND h.season = p.season
                INNER JOIN team AS t ON t.id = p.team_id
        `, params);

        let scoringOppTasks = db.any(`
            WITH drive_data AS (
                SELECT 	p.drive_id,
                        g.season,
                        CASE
                            WHEN gt.team_id = p.offense_id THEN (100 - p.yard_line)
                            ELSE p.yard_line
                        END AS yardsToGoal
                FROM game AS g
                    INNER JOIN game_team AS gt ON g.id = gt.game_id AND gt.home_away = 'home'
                    INNER JOIN game_team AS gt2 ON g.id = gt2.game_id AND gt2.id <> gt.id
                    INNER JOIN team AS t ON t.id IN (gt.team_id, gt2.team_id)
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN play AS p ON d.id = p.drive_id
                ${filter} AND d.start_period < 5
            ), drives AS (
                SELECT season, drive_id, MIN(yardsToGoal) AS min_yards
                FROM drive_data
                GROUP BY season, drive_id
            ), drive_points AS (
                SELECT  t.school,
                        season,
                        CASE
                            WHEN d.offense_id = t.id THEN 'offense'
                            ELSE 'defense'
                        END AS unit,
                        CASE
                            WHEN d.scoring AND d.result_id IN (12,20,24,26) THEN 7
                            WHEN d.scoring AND d.result_id IN (30) THEN 3
                            WHEN d.result_id IN (4,10,15,42,46) THEN -7
                            WHEN d.result_id IN (6) THEN -2
                            ELSE 0
                        END AS points
                FROM team AS t
                    INNER JOIN drive AS d ON t.id IN (d.offense_id, d.defense_id)
                    INNER JOIN drives AS dr ON d.id = dr.drive_id
                WHERE dr.min_yards <= 40
            )
            SELECT season, school, unit, AVG(points) AS points 
            FROM drive_points
            GROUP BY season, school, unit
        `, params);

        const fieldPositionTask = db.any(`
            WITH offensive_drives AS (
                SELECT 	g.season,
                        t.id AS team_id,
                        AVG(CASE
                            WHEN gt.home_away = 'home' THEN (100 - d.start_yardline)
                            ELSE d.start_yardline
                        END) as drive_start,
                        AVG(ppa.predicted_points) AS ppa
                FROM game AS g
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN game_team AS gt ON g.id = gt.game_id AND gt.team_id = d.offense_id
                    INNER JOIN team AS t ON d.offense_id = t.id
                    INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.end_year IS NULL
                    INNER JOIN ppa ON ppa.down = 1 AND ppa.distance = 10 AND ((gt.home_away = 'home' AND (100 - d.start_yardline) = ppa.yard_line) OR (gt.home_away = 'away' AND d.start_yardline = ppa.yard_line))
                ${filter} AND d.start_period < 5 AND d.result_id NOT IN (28, 41, 43, 44, 57)
                GROUP BY g.season, t.id
            ), defensive_drives AS (
                SELECT 	g.season,
                        t.id AS team_id,
                        AVG(CASE
                            WHEN gt.home_away = 'away' THEN (100 - d.start_yardline)
                            ELSE d.start_yardline
                        END) as drive_start,
                        AVG(ppa.predicted_points) AS ppa
                FROM game AS g
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN game_team AS gt ON g.id = gt.game_id AND gt.team_id = d.defense_id
                    INNER JOIN team AS t ON d.defense_id = t.id
                    INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.end_year IS NULL
                    INNER JOIN ppa ON ppa.down = 1 AND ppa.distance = 10 AND ((gt.home_away = 'away' AND (100 - d.start_yardline) = ppa.yard_line) OR (gt.home_away = 'home' AND d.start_yardline = ppa.yard_line))
                ${filter} AND d.start_period < 5 AND d.result_id NOT IN (28, 41, 43, 44, 57)
                GROUP BY g.season, t.id
            )
            SELECT 	o.season,
                    t.school,
                    ROUND(o.drive_start, 1) AS avg_start_off,
                    ROUND((o.ppa), 3) AS avg_predicted_points_off,
                    ROUND((d.drive_start), 1) AS avg_start_def,
                    ROUND((-d.ppa), 3) AS avg_predicted_points_def
            FROM team AS t
                INNER JOIN offensive_drives AS o ON o.team_id = t.id
                INNER JOIN defensive_drives AS d ON t.id = d.team_id AND o.season = d.season
        `, params);

        const fullResults = await Promise.all([
            mainTask,
            havocTask,
            scoringOppTasks,
            fieldPositionTask
        ]);

        const results = fullResults[0];
        const havocResults = fullResults[1];
        const scoringOppResults = fullResults[2];
        const fieldPositionResults = fullResults[3];

        let stats = [];
        let years = Array.from(new Set(results.map(r => r.season)));

        for (let year of years) {
            let teams = Array.from(new Set(results.filter(r => r.season == year).map(r => r.team)));

            let yearStats = teams.map(t => {
                let offense = results.find(r => r.season == year && r.team == t && r.unit == 'offense');
                let defense = results.find(r => r.season == year && r.team == t && r.unit == 'defense');
                let havoc = havocResults.find(r => r.season == year && r.team == t);
                let scoringOppO = scoringOppResults.find(r => r.season == year && r.school == t && r.unit == 'offense');
                let scoringOppD = scoringOppResults.find(r => r.season == year && r.school == t && r.unit == 'defense');
                let fieldPosition = fieldPositionResults.find(r => r.season == year && r.school == t);

                return {
                    season: year,
                    team: t,
                    conference: offense.conference,
                    offense: {
                        plays: parseInt(offense.plays),
                        drives: parseInt(offense.drives),
                        ppa: parseFloat(offense.ppa),
                        totalPPA: parseFloat(offense.total_ppa),
                        successRate: parseFloat(offense.success_rate),
                        explosiveness: parseFloat(offense.explosiveness),
                        powerSuccess: parseFloat(offense.power_success),
                        stuffRate: parseFloat(offense.stuff_rate),
                        lineYards: parseFloat(offense.line_yards),
                        lineYardsTotal: parseInt(offense.line_yards_sum),
                        secondLevelYards: parseFloat(offense.second_level_yards),
                        secondLevelYardsTotal: parseInt(offense.second_level_yards_sum),
                        openFieldYards: parseFloat(offense.open_field_yards),
                        openFieldYardsTotal: parseInt(offense.open_field_yards_sum),
                        pointsPerOpportunity: parseFloat(scoringOppO ? scoringOppO.points : 0),
                        fieldPosition: {
                            averageStart: parseFloat(fieldPosition.avg_start_off),
                            averagePredictedPoints: parseFloat(fieldPosition.avg_predicted_points_off)
                        },
                        standardDowns: {
                            rate: parseFloat(offense.standard_down_rate),
                            ppa: parseFloat(offense.standard_down_ppa),
                            successRate: parseFloat(offense.standard_down_success_rate),
                            explosiveness: parseFloat(offense.standard_down_explosiveness)
                        },
                        passingDowns: {
                            rate: parseFloat(offense.passing_down_rate),
                            ppa: parseFloat(offense.passing_down_ppa),
                            successRate: parseFloat(offense.passing_down_success_rate),
                            explosiveness: parseFloat(offense.passing_down_explosiveness)
                        },
                        rushingPlays: {
                            rate: parseFloat(offense.rush_rate),
                            ppa: parseFloat(offense.rushing_ppa),
                            totalPPA: parseFloat(offense.total_rushing_ppa),
                            successRate: parseFloat(offense.rush_success_rate),
                            explosiveness: parseFloat(offense.rush_explosiveness)
                        },
                        passingPlays: {
                            rate: parseFloat(offense.passing_rate),
                            ppa: parseFloat(offense.passing_ppa),
                            totalPPA: parseFloat(offense.total_passing_ppa),
                            successRate: parseFloat(offense.pass_success_rate),
                            explosiveness: parseFloat(offense.pass_explosiveness)
                        }
                    },
                    defense: {
                        plays: parseInt(defense.plays),
                        drives: parseInt(defense.drives),
                        ppa: parseFloat(defense.ppa),
                        totalPPA: parseFloat(defense.total_ppa),
                        successRate: parseFloat(defense.success_rate),
                        explosiveness: parseFloat(defense.explosiveness),
                        powerSuccess: parseFloat(defense.power_success),
                        stuffRate: parseFloat(defense.stuff_rate),
                        lineYards: parseFloat(defense.line_yards),
                        lineYardsTotal: parseInt(defense.line_yards_sum),
                        secondLevelYards: parseFloat(defense.second_level_yards),
                        secondLevelYardsTotal: parseInt(defense.second_level_yards_sum),
                        openFieldYards: parseFloat(defense.open_field_yards),
                        openFieldYardsTotal: parseInt(defense.open_field_yards_sum),
                        pointsPerOpportunity: parseFloat(scoringOppD ? scoringOppD.points : 0),
                        fieldPosition: {
                            averageStart: parseFloat(fieldPosition.avg_start_def),
                            averagePredictedPoints: parseFloat(fieldPosition.avg_predicted_points_def)
                        },
                        havoc: {
                            total: havoc ? parseFloat(havoc.total_havoc) : null,
                            frontSeven: havoc ? parseFloat(havoc.front_seven_havoc) : null,
                            db: havoc ? parseFloat(havoc.db_havoc) : null
                        },
                        standardDowns: {
                            rate: parseFloat(defense.standard_down_rate),
                            ppa: parseFloat(defense.standard_down_ppa),
                            successRate: parseFloat(defense.standard_down_success_rate),
                            explosiveness: parseFloat(defense.standard_down_explosiveness)
                        },
                        passingDowns: {
                            rate: parseFloat(defense.passing_down_rate),
                            ppa: parseFloat(defense.passing_down_ppa),
                            totalPPA: parseFloat(defense.total_passing_ppa),
                            successRate: parseFloat(defense.passing_down_success_rate),
                            explosiveness: parseFloat(defense.passing_down_explosiveness)
                        },
                        rushingPlays: {
                            rate: parseFloat(defense.rush_rate),
                            ppa: parseFloat(defense.rushing_ppa),
                            totalPPA: parseFloat(defense.total_rushing_ppa),
                            successRate: parseFloat(defense.rush_success_rate),
                            explosiveness: parseFloat(defense.rush_explosiveness)
                        },
                        passingPlays: {
                            rate: parseFloat(defense.passing_rate),
                            ppa: parseFloat(defense.passing_ppa),
                            successRate: parseFloat(defense.pass_success_rate),
                            explosiveness: parseFloat(defense.pass_explosiveness)
                        }
                    }
                }
            });

            stats = [
                ...stats,
                ...yearStats
            ];
        }

        return stats;
    };

    const getAdvancedGameStats = async (year, team, week, opponent, excludeGarbageTime, seasonType) => {
        let filter = 'WHERE ';
        let params = [];
        let index = 1;

        if (year) {
            filter += `g.season = $${index}`;
            params.push(year);
            index++;
        }

        if (team) {
            filter += ` ${year ? 'AND ' : ''}LOWER(t.school) = LOWER($${index})`;
            params.push(team);
            index++;
        }

        if (opponent) {
            filter += ` ${params.length ? 'AND ' : ''}LOWER(t2.school) = LOWER($${index})`;
            params.push(opponent);
            index++;
        }

        if (week) {
            filter += ` ${params.length ? 'AND ' : ''}g.week = $${index}`;
            params.push(week);
            index++;
        }

        if (seasonType && seasonType.toLowerCase() !== 'both') {
            filter += ` ${params.length ? 'AND ' : ''}g.season_type = $${index}`;
            params.push(seasonType);
            index++;
        }

        const results = await db.any(`
        WITH plays AS (
            SELECT  g.id,
                    g.season,
                    g.week,
                    t.school,
                    t2.school AS opponent,
                    p.drive_id,
                    p.down,
                    p.distance,
                    p.yards_gained,
                    CASE
                        WHEN p.offense_id = t.id THEN 'offense'
                        ELSE 'defense'
                    END AS o_d,
                    CASE
                        WHEN p.down = 2 AND p.distance >= 8 THEN 'passing'
                        WHEN p.down IN (3,4) AND p.distance >= 5 THEN 'passing'
                        ELSE 'standard'
                    END AS down_type,
                    CASE
                        WHEN p.scoring = true AND p.play_type_id NOT IN (26,36,38,39) THEN true
                        WHEN p.down = 1 AND (CAST(p.yards_gained AS NUMERIC) / p.distance) >= 0.5 THEN true
                        WHEN p.down = 2 AND (CAST(p.yards_gained AS NUMERIC) / p.distance) >= 0.7 THEN true
                        WHEN p.down IN (3,4) AND (p.yards_gained >= p.distance) THEN true
                        ELSE false
                    END AS success,
                    CASE 
                        WHEN p.play_type_id IN (3,4,6,7,24,26,36,51,67) THEN 'Pass'
                        WHEN p.play_type_id IN (5,9,29,39,68) THEN 'Rush'
                        ELSE 'Other'
                    END AS play_type,
                    CASE
                        WHEN p.period = 2 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 38 THEN true
                        WHEN p.period = 3 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 28 THEN true
                        WHEN p.period = 4 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 22 THEN true
                        WHEN p.period = 2 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 45 THEN true
                        WHEN p.period = 3 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 35 THEN true
                        WHEN p.period = 4 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 29 THEN true
                        ELSE false
                    END AS garbage_time,
                    p.ppa AS ppa
            FROM game AS g
                INNER JOIN game_team AS gt ON g.id = gt.game_id
                INNER JOIN team AS t ON gt.team_id = t.id
                INNER JOIN game_team AS gt2 ON g.id = gt2.game_id AND gt.id <> gt2.id
                INNER JOIN team AS t2 ON gt2.team_id = t2.id
                INNER JOIN drive AS d ON g.id = d.game_id
                INNER JOIN play AS p ON d.id = p.drive_id AND p.ppa IS NOT NULL
            ${filter}
        )
        SELECT 	id,
                season,
                week,
                school AS team,
                opponent,
                o_d AS unit,
                COUNT(ppa) AS plays,
                COUNT(DISTINCT(drive_id)) AS drives,
                AVG(ppa) AS ppa,
                SUM(ppa) AS total_ppa,
                AVG(ppa) FILTER(WHERE down_type = 'standard') AS standard_down_ppa,
                AVG(ppa) FILTER(WHERE down_type = 'passing') AS passing_down_ppa,
                AVG(ppa) FILTER(WHERE play_type = 'Pass') AS passing_ppa,
                AVG(ppa) FILTER(WHERE play_type = 'Rush') AS rushing_ppa,
                SUM(ppa) FILTER(WHERE play_type = 'Pass') AS total_passing_ppa,
                SUM(ppa) FILTER(WHERE play_type = 'Rush') AS total_rushing_ppa,
                CAST((COUNT(*) FILTER(WHERE success = true)) AS NUMERIC) / COUNT(*) AS success_rate,
                AVG(ppa) FILTER(WHERE success = true) AS explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND down_type = 'standard')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE down_type = 'standard'), 0), 1) AS standard_down_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND down_type = 'standard') AS standard_down_explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND down_type = 'passing')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE down_type = 'passing'), 0), 1) AS passing_down_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND down_type = 'passing') AS passing_down_explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND play_type = 'Rush')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1) AS rush_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND play_type = 'Rush') AS rush_explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND play_type = 'Pass')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Pass'), 0), 1) AS pass_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND play_type = 'Pass') AS pass_explosiveness,
                CAST(COUNT(*) FILTER(WHERE distance <= 2 AND play_type = 'Rush' AND success = true) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE distance <= 2 AND play_type = 'Rush'), 0), 1) AS power_success,
                CAST(COUNT(*) FILTER(WHERE play_type = 'Rush' AND yards_gained <= 0) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1) AS stuff_rate,
                COALESCE(CAST(SUM(CASE WHEN yards_gained <= 0 THEN yards_gained * 1.2 WHEN yards_gained < 5 THEN yards_gained WHEN yards_gained < 11 THEN 4 + (yards_gained - 4) * .5 ELSE 7 END) FILTER (WHERE play_type = 'Rush') AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1), 0) AS line_yards,
                ROUND(COALESCE(CAST(SUM(CASE WHEN yards_gained <= 0 THEN yards_gained * 1.2 WHEN yards_gained < 5 THEN yards_gained WHEN yards_gained < 11 THEN 4 + (yards_gained - 4) * .5 ELSE 7 END) FILTER (WHERE play_type = 'Rush') AS NUMERIC), 0), 0) AS line_yards_sum,
                CAST(SUM(CASE WHEN yards_gained >= 10 THEN 5 ELSE (yards_gained - 5) END) FILTER(WHERE yards_gained >= 5 AND play_type = 'Rush') AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1) AS second_level_yards,
                CAST(SUM(CASE WHEN yards_gained >= 10 THEN 5 ELSE (yards_gained - 5) END) FILTER(WHERE yards_gained >= 5 AND play_type = 'Rush') AS NUMERIC) AS second_level_yards_sum,
                CAST(SUM(yards_gained - 10) FILTER(WHERE play_type = 'Rush' AND yards_gained >= 10) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1) AS open_field_yards,
                CAST(SUM(yards_gained - 10) FILTER(WHERE play_type = 'Rush' AND yards_gained >= 10) AS NUMERIC) AS open_field_yards_sum
        FROM plays
        ${excludeGarbageTime == 'true' ? 'WHERE garbage_time = false' : ''}
        GROUP BY id, season, week, school, opponent, o_d
        `, params);

        let stats = [];
        let ids = Array.from(new Set(results.map(r => r.id)));

        for (let id of ids) {
            let teams = Array.from(new Set(results.filter(r => r.id == id).map(r => r.team)));

            let gameStats = teams.map(t => {
                let offense = results.find(r => r.id == id && r.team == t && r.unit == 'offense');
                let defense = results.find(r => r.id == id && r.team == t && r.unit == 'defense');

                if (!offense || ! defense) {
                    return null;
                }

                return {
                    gameId: id,
                    season: offense.year,
                    week: offense.week,
                    team: t,
                    opponent: offense.opponent,
                    offense: {
                        plays: parseInt(offense.plays),
                        drives: parseInt(offense.drives),
                        ppa: parseFloat(offense.ppa),
                        totalPPA: parseFloat(offense.total_ppa),
                        successRate: parseFloat(offense.success_rate),
                        explosiveness: parseFloat(offense.explosiveness),
                        powerSuccess: parseFloat(offense.power_success),
                        stuffRate: parseFloat(offense.stuff_rate),
                        lineYards: parseFloat(offense.line_yards),
                        lineYardsTotal: parseInt(offense.line_yards_sum),
                        secondLevelYards: parseFloat(offense.second_level_yards),
                        secondLevelYardsTotal: parseInt(offense.second_level_yards_sum),
                        openFieldYards: parseFloat(offense.open_field_yards),
                        openFieldYardsTotal: parseInt(offense.open_field_yards_sum),
                        standardDowns: {
                            ppa: parseFloat(offense.standard_down_ppa),
                            successRate: parseFloat(offense.standard_down_success_rate),
                            explosiveness: parseFloat(offense.standard_down_explosiveness)
                        },
                        passingDowns: {
                            ppa: parseFloat(offense.passing_down_ppa),
                            successRate: parseFloat(offense.passing_down_success_rate),
                            explosiveness: parseFloat(offense.passing_down_explosiveness)
                        },
                        rushingPlays: {
                            ppa: parseFloat(offense.rushing_ppa),
                            totalPPA: parseFloat(offense.total_rushing_ppa),
                            successRate: parseFloat(offense.rush_success_rate),
                            explosiveness: parseFloat(offense.rush_explosiveness)
                        },
                        passingPlays: {
                            ppa: parseFloat(offense.passing_ppa),
                            totalPPA: parseFloat(offense.total_passing_ppa),
                            successRate: parseFloat(offense.pass_success_rate),
                            explosiveness: parseFloat(offense.pass_explosiveness)
                        }
                    },
                    defense: {
                        plays: parseInt(defense.plays),
                        drives: parseInt(defense.drives),
                        ppa: parseFloat(defense.ppa),
                        totalPPA: parseFloat(defense.total_ppa),
                        successRate: parseFloat(defense.success_rate),
                        explosiveness: parseFloat(defense.explosiveness),
                        powerSuccess: parseFloat(defense.power_success),
                        stuffRate: parseFloat(defense.stuff_rate),
                        lineYards: parseFloat(defense.line_yards),
                        lineYardsTotal: parseInt(defense.line_yards_sum),
                        secondLevelYards: parseFloat(defense.second_level_yards),
                        secondLevelYardsTotal: parseInt(defense.second_level_yards_sum),
                        openFieldYards: parseFloat(defense.open_field_yards),
                        openFieldYardsTotal: parseInt(defense.open_field_yards_sum),
                        standardDowns: {
                            ppa: parseFloat(defense.standard_down_ppa),
                            successRate: parseFloat(defense.standard_down_success_rate),
                            explosiveness: parseFloat(defense.standard_down_explosiveness)
                        },
                        passingDowns: {
                            ppa: parseFloat(defense.passing_down_ppa),
                            successRate: parseFloat(defense.passing_down_success_rate),
                            explosiveness: parseFloat(defense.passing_down_explosiveness)
                        },
                        rushingPlays: {
                            ppa: parseFloat(defense.rushing_ppa),
                            totalPPA: parseFloat(defense.total_rushing_ppa),
                            successRate: parseFloat(defense.rush_success_rate),
                            explosiveness: parseFloat(defense.rush_explosiveness)
                        },
                        passingPlays: {
                            ppa: parseFloat(defense.passing_ppa),
                            totalPPA: parseFloat(defense.total_passing_ppa),
                            successRate: parseFloat(defense.pass_success_rate),
                            explosiveness: parseFloat(defense.pass_explosiveness)
                        }
                    }
                }
            }).filter(r => r != null);

            stats = [
                ...stats,
                ...gameStats
            ];
        }

        return stats;
    };

    const getAdvancedBoxScore = async (id) => {
        const teamTask = db.any(` 
            WITH havoc AS (
                WITH fumbles AS (
                    SELECT t.school, COALESCE(SUM(CAST(s.stat AS NUMERIC)), 0.0) AS fumbles
                    FROM game AS g
                        INNER JOIN game_team AS gt ON g.id = gt.game_id
                        INNER JOIN team AS t ON gt.team_id = t.id
                        LEFT JOIN game_player_stat AS s ON s.game_team_id = gt.id AND s.type_id = 4 AND s.category_id = 10
                    WHERE g.id = $1
                    GROUP BY t.school
                )
                SELECT 	t.school,
                        (COALESCE(SUM(CAST(s.stat AS NUMERIC)), 0.0) + fumbles) AS total_havoc,
                        COALESCE(SUM(CAST(s.stat AS NUMERIC)) FILTER (WHERE s.type_id IN (16,24)), 0.0) AS db_havoc,
                        (COALESCE(SUM(CAST(s.stat AS NUMERIC)) FILTER (WHERE s.type_id = 21), 0.0) + f.fumbles) AS front_seven_havoc
                FROM game AS g
                    INNER JOIN game_team AS gt ON g.id = gt.game_id
                    INNER JOIN game_team AS gt2 ON g.id = gt2.game_id AND gt.id <> gt2.id
                    INNER JOIN team AS t ON gt.team_id = t.id
                    INNER JOIN game_team_stat AS s ON s.game_team_id = gt.id AND s.type_id IN (16,21,24)
                    LEFT JOIN fumbles AS f ON t.school <> f.school
                WHERE g.id = $1
                GROUP BY t.school, f.fumbles
            ), plays AS (
                SELECT  g.id,
                        g.season,
                        g.week,
                        t.school,
                        CASE
                            WHEN p.down = 2 AND p.distance >= 8 THEN 'passing'
                            WHEN p.down IN (3,4) AND p.distance >= 5 THEN 'passing'
                            ELSE 'standard'
                        END AS down_type,
                        CASE
                            WHEN p.scoring = true AND p.play_type_id NOT IN (26,36,38,39) THEN true
                            WHEN p.down = 1 AND (CAST(p.yards_gained AS NUMERIC) / p.distance) >= 0.5 THEN true
                            WHEN p.down = 2 AND (CAST(p.yards_gained AS NUMERIC) / p.distance) >= 0.7 THEN true
                            WHEN p.down IN (3,4) AND (p.yards_gained >= p.distance) THEN true
                            ELSE false
                        END AS success,
                        CASE 
                            WHEN p.play_type_id IN (3,4,6,7,24,26,36,51,67) THEN 'Pass'
                            WHEN p.play_type_id IN (5,9,29,39,68) THEN 'Rush'
                            ELSE 'Other'
                        END AS play_type,
                        CASE
                            WHEN p.period = 2 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 38 THEN true
                            WHEN p.period = 3 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 28 THEN true
                            WHEN p.period = 4 AND p.scoring = false AND ABS(p.home_score - p.away_score) > 22 THEN true
                            WHEN p.period = 2 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 45 THEN true
                            WHEN p.period = 3 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 35 THEN true
                            WHEN p.period = 4 AND p.scoring = true AND ABS(p.home_score - p.away_score) > 29 THEN true
                            ELSE false
                        END AS garbage_time,
                        p.period,
                        p.down,
                        p.distance,
                        p.yards_gained,
                        p.ppa AS ppa,
                        COALESCE(h.total_havoc, 0.0) AS total_havoc,
                        COALESCE(h.db_havoc, 0.0) AS db_havoc,
                        COALESCE(h.front_seven_havoc, 0.0) AS front_seven_havoc
                FROM game AS g
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN play AS p ON d.id = p.drive_id AND p.ppa IS NOT NULL
                    INNER JOIN team AS t ON p.offense_id = t.id
                    LEFT JOIN havoc AS h ON t.school <> h.school
                WHERE g.id = $1
            )
            SELECT 	school AS team,
                    ROUND(CAST(AVG(ppa) AS NUMERIC), 4) AS ppa,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE period = 1) AS NUMERIC), 4) AS ppa_1,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE period = 2) AS NUMERIC), 4) AS ppa_2,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE period = 3) AS NUMERIC), 4) AS ppa_3,
                    COALESCE(ROUND(CAST(AVG(ppa) FILTER(WHERE period = 4) AS NUMERIC), 4), 0) AS ppa_4,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass') AS NUMERIC), 4) AS passing_ppa,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass' AND period = 1) AS NUMERIC), 4) AS passing_ppa_1,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass' AND period = 2) AS NUMERIC), 4) AS passing_ppa_2,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass' AND period = 3) AS NUMERIC), 4) AS passing_ppa_3,
                    COALESCE(ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass' AND period = 4) AS NUMERIC), 4), 0) AS passing_ppa_4,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush') AS NUMERIC), 4) AS rushing_ppa,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush' AND period = 1) AS NUMERIC), 4) AS rushing_ppa_1,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush' AND period = 2) AS NUMERIC), 4) AS rushing_ppa_2,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush' AND period = 3) AS NUMERIC), 4) AS rushing_ppa_3,
                    COALESCE(ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush' AND period = 4) AS NUMERIC), 4), 0) AS rushing_ppa_4,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END), 3) AS success_rate,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 1), 3) AS success_rate_1,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 2), 3) AS success_rate_2,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 3), 3) AS success_rate_3,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 4), 3) AS success_rate_4,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE down_type = 'standard'), 3) AS standard_success_rate,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 1 AND down_type = 'standard'), 3) AS standard_success_rate_1,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 2 AND down_type = 'standard'), 3) AS standard_success_rate_2,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 3 AND down_type = 'standard'), 3) AS standard_success_rate_3,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 4 AND down_type = 'standard'), 3) AS standard_success_rate_4,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE down_type = 'passing'), 3) AS passing_success_rate,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 1 AND down_type = 'passing'), 3) AS passing_success_rate_1,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 2 AND down_type = 'passing'), 3) AS passing_success_rate_2,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 3 AND down_type = 'passing'), 3) AS passing_success_rate_3,
					ROUND(AVG(CASE WHEN success = true THEN 1 ELSE 0 END) FILTER(WHERE period = 4 AND down_type = 'passing'), 3) AS passing_success_rate_4,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE success = true) AS NUMERIC), 2) AS explosiveness,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE success = true AND period = 1) AS NUMERIC), 2) AS explosiveness_1,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE success = true AND period = 2) AS NUMERIC), 2) AS explosiveness_2,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE success = true AND period = 3) AS NUMERIC), 2) AS explosiveness_3,
                    COALESCE(ROUND(CAST(AVG(ppa) FILTER(WHERE success = true AND period = 4) AS NUMERIC), 2), 0) AS explosiveness_4,
                    ROUND(CAST(COUNT(*) FILTER(WHERE distance <= 2 AND play_type = 'Rush' AND success = true) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE distance <= 2 AND play_type = 'Rush'), 0), 1), 3) AS power_success,
                    ROUND(CAST(COUNT(*) FILTER(WHERE play_type = 'Rush' AND yards_gained <= 0) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1), 3) AS stuff_rate,
                    ROUND(COALESCE(CAST(SUM(CASE WHEN yards_gained <= 0 THEN yards_gained * 1.2 WHEN yards_gained < 5 THEN yards_gained WHEN yards_gained < 11 THEN 4 + (yards_gained - 4) * .5 ELSE 7 END) FILTER (WHERE play_type = 'Rush') AS NUMERIC), 0), 0) AS line_yards,
                    COALESCE(CAST(SUM(CASE WHEN yards_gained >= 10 THEN 5 ELSE (yards_gained - 5) END) FILTER(WHERE yards_gained >= 5 AND play_type = 'Rush') AS NUMERIC), 0) AS second_level_yards,
                    COALESCE(CAST(SUM(yards_gained - 10) FILTER(WHERE play_type = 'Rush' AND yards_gained >= 10) AS NUMERIC), 0) AS open_field_yards,
                    COALESCE(ROUND(CAST(SUM(CASE WHEN yards_gained <= 0 THEN yards_gained * 1.2 WHEN yards_gained < 5 THEN yards_gained WHEN yards_gained < 11 THEN 4 + (yards_gained - 4) * .5 ELSE 7 END) FILTER (WHERE play_type = 'Rush') AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1), 1), 0) AS line_yards_avg,
                    COALESCE(ROUND(CAST(SUM(CASE WHEN yards_gained >= 10 THEN 5 ELSE (yards_gained - 5) END) FILTER(WHERE yards_gained >= 5 AND play_type = 'Rush') AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1), 1), 0) AS second_level_yards_avg,
                    COALESCE(ROUND(CAST(SUM(yards_gained - 10) FILTER(WHERE play_type = 'Rush' AND yards_gained >= 10) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1), 1), 0) AS open_field_yards_avg,
                    ROUND(total_havoc / COUNT(*), 3) AS total_havoc,
                    ROUND(db_havoc / COUNT(*), 3) AS db_havoc,
                    ROUND(front_seven_havoc / COUNT(*), 3) AS front_seven_havoc,
                    COUNT(*) AS plays,
                    COUNT(*) FILTER(WHERE period = 1) AS plays_1,
                    COUNT(*) FILTER(WHERE period = 2) AS plays_2,
                    COUNT(*) FILTER(WHERE period = 3) AS plays_3,
                    COUNT(*) FILTER(WHERE period = 4) AS plays_4
            FROM plays
            WHERE garbage_time = false
            GROUP BY school, total_havoc, db_havoc, front_seven_havoc
        `, [id]);

        const playerTask = db.any(`
            WITH plays AS (
                SELECT DISTINCT t.id AS team_id,
                                t.school,
                                a.id,
                                a.name,
                                po.abbreviation AS position,
                                p.id AS play_id,
                                p.period,
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
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN play AS p ON d.id = p.drive_id AND p.ppa IS NOT NULL
                    INNER JOIN team AS t ON p.offense_id = t.id
                    INNER JOIN play_stat AS ps ON p.id = ps.play_id
                    INNER JOIN athlete AS a ON ps.athlete_id = a.id AND a.team_id = t.id
                    INNER JOIN position AS po ON a.position_id = po.id
                WHERE g.id = $1
            ), teams AS (
                SELECT 	t.id,
                        t.school,
                        p.period,
                        CASE
                            WHEN p.play_type_id IN (3,4,6,7,24,26,36,51,67) THEN 'Pass'
                            WHEN p.play_type_id IN (5,9,29,39,68) THEN 'Rush'
                            ELSE 'Other'
                        END AS play_type,
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
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN play AS p ON d.id = p.drive_id AND p.ppa IS NOT NULL
                    INNER JOIN team AS t ON p.offense_id = t.id
                WHERE g.id = $1
            ), team_counts AS (
                SELECT 	id,
                        school,
                        COALESCE(NULLIF(COUNT(*), 0), 1) AS plays,
                        COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Rush'), 0), 1) AS rush,
                        COALESCE(NULLIF(COUNT(*) FILTER(WHERE play_type = 'Pass'), 0), 1) AS pass,
                        COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 1), 0), 1) AS plays_1,
                        COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 2), 0), 1) AS plays_2,
                        COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 3), 0), 1) AS plays_3,
                        COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 4), 0), 1) AS plays_4
                FROM teams
                WHERE garbage_time = false
                GROUP BY id, school
            )
            SELECT p.id,
                p."name",
                p.position,
                p.school,
                COUNT(p.ppa) AS plays,
                ROUND(CAST(CAST(COUNT(p.ppa) AS NUMERIC) / t.plays AS NUMERIC), 3) AS overall_usage,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.period = 1) AS NUMERIC) / t.plays_1 AS NUMERIC), 3) AS overall_usage_1,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.period = 2) AS NUMERIC) / t.plays_2 AS NUMERIC), 3) AS overall_usage_2,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.period = 3) AS NUMERIC) / t.plays_3 AS NUMERIC), 3) AS overall_usage_3,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.period = 4) AS NUMERIC) / t.plays_4 AS NUMERIC), 3) AS overall_usage_4,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.play_type = 'Pass') AS NUMERIC) / t.pass AS NUMERIC), 3) AS pass_usage,
                ROUND(CAST(CAST(COUNT(p.ppa) FILTER(WHERE p.play_type = 'Rush') AS NUMERIC) / t.rush AS NUMERIC), 3) AS rush_usage,
                ROUND(CAST(AVG(p.ppa) AS NUMERIC), 3) AS ppa,
                COALESCE(ROUND(CAST(AVG(p.ppa) FILTER(WHERE p.period = 1) AS NUMERIC), 3), 0) AS ppa_1,
                COALESCE(ROUND(CAST(AVG(p.ppa) FILTER(WHERE p.period = 2) AS NUMERIC), 3), 0) AS ppa_2,
                COALESCE(ROUND(CAST(AVG(p.ppa) FILTER(WHERE p.period = 3) AS NUMERIC), 3), 0) AS ppa_3,
                COALESCE(ROUND(CAST(AVG(p.ppa) FILTER(WHERE p.period = 4) AS NUMERIC), 3), 0) AS ppa_4,
                COALESCE(ROUND(CAST(AVG(p.ppa) FILTER(WHERE p.play_type = 'Pass') AS NUMERIC), 3), 0) AS ppa_pass,
                COALESCE(ROUND(CAST(AVG(p.ppa) FILTER(WHERE p.play_type = 'Rush') AS NUMERIC), 3), 0) AS ppa_rush,
                ROUND(CAST(SUM(p.ppa) AS NUMERIC), 3) AS cum_ppa,
                COALESCE(ROUND(CAST(SUM(p.ppa) FILTER(WHERE p.period = 1) AS NUMERIC), 3), 0) AS cum_ppa_1,
                COALESCE(ROUND(CAST(SUM(p.ppa) FILTER(WHERE p.period = 2) AS NUMERIC), 3), 0) AS cum_ppa_2,
                COALESCE(ROUND(CAST(SUM(p.ppa) FILTER(WHERE p.period = 3) AS NUMERIC), 3), 0) AS cum_ppa_3,
                COALESCE(ROUND(CAST(SUM(p.ppa) FILTER(WHERE p.period = 4) AS NUMERIC), 3), 0) AS cum_ppa_4,
                COALESCE(ROUND(CAST(SUM(p.ppa) FILTER(WHERE p.play_type = 'Pass') AS NUMERIC), 3), 0) AS cum_ppa_pass,
                COALESCE(ROUND(CAST(SUM(p.ppa) FILTER(WHERE p.play_type = 'Rush') AS NUMERIC), 3), 0) AS cum_ppa_rush
            FROM plays AS p
                INNER JOIN team_counts AS t ON p.team_id = t.id
            WHERE position IN ('QB', 'RB', 'FB', 'TE', 'WR') AND p.garbage_time = false
            GROUP BY p.id, p."name", p.position, p.school, t.plays, t.pass, t.rush, t.plays_1, t.plays_2, t.plays_3, t.plays_4
            ORDER BY overall_usage DESC
        `, [id]);

        let scoringOppTask = db.any(`
            WITH drive_data AS (
                SELECT 	p.drive_id,
                        g.season,
                        CASE
                            WHEN gt.team_id = p.offense_id THEN (100 - p.yard_line)
                            ELSE p.yard_line
                        END AS yardsToGoal
                FROM game AS g
                    INNER JOIN game_team AS gt ON g.id = gt.game_id AND gt.home_away = 'home'
                    INNER JOIN game_team AS gt2 ON g.id = gt2.game_id AND gt2.id <> gt.id
                    INNER JOIN team AS t ON t.id IN (gt.team_id, gt2.team_id)
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN play AS p ON d.id = p.drive_id
                WHERE g.id = $1 AND d.start_period < 5
            ), drives AS (
                SELECT season, drive_id, MIN(yardsToGoal) AS min_yards
                FROM drive_data
                GROUP BY season, drive_id
            ), drive_points AS (
                SELECT  t.school AS team,
                        season,
                        CASE
                            WHEN d.offense_id = t.id THEN 'offense'
                            ELSE 'defense'
                        END AS unit,
                        CASE
                            WHEN d.scoring AND d.result_id IN (12,20,24,26) THEN 7
                            WHEN d.scoring AND d.result_id IN (30) THEN 3
                            WHEN d.result_id IN (4,10,15,42,46) THEN -7
                            WHEN d.result_id IN (6) THEN -2
                            ELSE 0
                        END AS points
                FROM team AS t
                    INNER JOIN drive AS d ON t.id IN (d.offense_id, d.defense_id)
                    INNER JOIN drives AS dr ON d.id = dr.drive_id
                WHERE dr.min_yards <= 40
            )
            SELECT team, unit, COUNT(*) AS opportunities, ROUND(AVG(points), 2) AS avg_points, SUM(points) AS points
            FROM drive_points
            GROUP BY season, team, unit
        `, [id]);

        const fieldPositionTask = db.any(`
WITH offensive_drives AS (
	SELECT 	t.id AS team_id,
			AVG(CASE
				WHEN gt.home_away = 'home' THEN (100 - d.start_yardline)
				ELSE d.start_yardline
			END) as drive_start,
			AVG(ppa.predicted_points) AS ppa
	FROM game AS g
		LEFT JOIN drive AS d ON g.id = d.game_id AND d.start_period < 5 AND d.result_id NOT IN (28, 41, 43, 44, 57)
		LEFT JOIN game_team AS gt ON g.id = gt.game_id AND gt.team_id = d.offense_id
		LEFT JOIN team AS t ON d.offense_id = t.id
		LEFT JOIN conference_team AS ct ON t.id = ct.team_id AND ct.end_year IS NULL
		LEFT JOIN ppa ON ppa.down = 1 AND ppa.distance = 10 AND ((gt.home_away = 'home' AND (100 - d.start_yardline) = ppa.yard_line) OR (gt.home_away = 'away' AND d.start_yardline = ppa.yard_line))
	WHERE g.id = $1
	GROUP BY t.id
), defensive_drives AS (
	SELECT 	t.id AS team_id,
			AVG(CASE
				WHEN gt.home_away = 'away' THEN (100 - d.start_yardline)
				ELSE d.start_yardline
			END) as drive_start,
			AVG(ppa.predicted_points) AS ppa
	FROM game AS g
		LEFT JOIN drive AS d ON g.id = d.game_id AND d.start_period < 5 AND d.result_id NOT IN (28, 41, 43, 44, 57)
		LEFT JOIN game_team AS gt ON g.id = gt.game_id AND gt.team_id = d.defense_id
		LEFT JOIN team AS t ON d.defense_id = t.id
		LEFT JOIN conference_team AS ct ON t.id = ct.team_id AND ct.end_year IS NULL
		LEFT JOIN ppa ON ppa.down = 1 AND ppa.distance = 10 AND ((gt.home_away = 'away' AND (100 - d.start_yardline) = ppa.yard_line) OR (gt.home_away = 'home' AND d.start_yardline = ppa.yard_line))
	WHERE g.id = $1
	GROUP BY t.id
)
SELECT 	t.school,
		ROUND(o.drive_start, 1) AS avg_start_off,
		ROUND((o.ppa), 2) AS avg_predicted_points_off,
		ROUND((d.drive_start), 1) AS avg_start_def,
		ROUND((-d.ppa), 2) AS avg_predicted_points_def
FROM team AS t
	INNER JOIN offensive_drives AS o ON o.team_id = t.id
	INNER JOIN defensive_drives AS d ON t.id = d.team_id
        `, [id]);

        const results = await Promise.all([
            teamTask,
            playerTask,
            scoringOppTask,
            fieldPositionTask
        ]);

        const teamResults = results[0];
        const playerResults = results[1];
        const scoringOppResults = results[2];
        const fieldPositionResults = results[3];

        let teams = Array.from(new Set(teamResults.map(t => t.team)));

        return {
            teams: {
                ppa: teamResults.map(t => ({
                    team: t.team,
                    overall: {
                        total: parseFloat(t.ppa),
                        quarter1: parseFloat(t.ppa_1),
                        quarter2: parseFloat(t.ppa_2),
                        quarter3: parseFloat(t.ppa_3),
                        quarter4: parseFloat(t.ppa_4)
                    },
                    passing: {
                        total: parseFloat(t.passing_ppa),
                        quarter1: parseFloat(t.passing_ppa_1),
                        quarter2: parseFloat(t.passing_ppa_2),
                        quarter3: parseFloat(t.passing_ppa_3),
                        quarter4: parseFloat(t.passing_ppa_4)
                    },
                    rushing: {
                        total: parseFloat(t.rushing_ppa),
                        quarter1: parseFloat(t.rushing_ppa_1),
                        quarter2: parseFloat(t.rushing_ppa_2),
                        quarter3: parseFloat(t.rushing_ppa_3),
                        quarter4: parseFloat(t.rushing_ppa_4)
                    }
                })),
                successRates: teamResults.map(t => ({
                    team: t.team,
                    overall: {
                        total: parseFloat(t.success_rate),
                        quarter1: parseFloat(t.success_rate_1),
                        quarter2: parseFloat(t.success_rate_2),
                        quarter3: parseFloat(t.success_rate_3),
                        quarter4: parseFloat(t.success_rate_4)
                    },
                    standardDowns: {
                        total: parseFloat(t.standard_success_rate),
                        quarter1: parseFloat(t.standard_success_rate_1),
                        quarter2: parseFloat(t.standard_success_rate_2),
                        quarter3: parseFloat(t.standard_success_rate_3),
                        quarter4: parseFloat(t.standard_success_rate_4)
                    },
                    passingDowns: {
                        total: parseFloat(t.passing_success_rate),
                        quarter1: parseFloat(t.passing_success_rate_1),
                        quarter2: parseFloat(t.passing_success_rate_2),
                        quarter3: parseFloat(t.passing_success_rate_3),
                        quarter4: parseFloat(t.passing_success_rate_4)
                    }
                })),
                explosiveness: teamResults.map(t => ({
                    team: t.team,
                    overall: {
                        total: parseFloat(t.explosiveness),
                        quarter1: parseFloat(t.explosiveness_1),
                        quarter2: parseFloat(t.explosiveness_2),
                        quarter3: parseFloat(t.explosiveness_3),
                        quarter4: parseFloat(t.explosiveness_4)
                    }
                })),
                rushing: teamResults.map(t => ({
                    team: t.team,
                    powerSuccess: t.power_success,
                    stuffRate: t.stuff_rate,
                    lineYards: t.line_yards,
                    lineYardsAverage: t.line_yards_avg,
                    secondLevelYards: t.second_level_yards,
                    secondLevelYardsAverage: t.second_level_yards_avg,
                    openFieldYards: t.open_field_yards,
                    openFieldYardsAverage: t.open_field_yards_avg
                })),
                havoc: teamResults.map(t => ({
                    team: teams.find(te => te != t.team),
                    total: t.total_havoc,
                    frontSeven: t.front_seven_havoc,
                    db: t.db_havoc
                })),
                scoringOpportunities: teamResults.map(t => {
                    let scoring = scoringOppResults.find(o => t.team == o.team && o.unit == 'offense');

                    return {
                        team: t.team,
                        opportunities: scoring ? parseInt(scoring.opportunities) : 0,
                        points: scoring ? parseInt(scoring.points) : 0,
                        pointsPerOpportunity: scoring ? parseFloat(scoring.avg_points) : 0
                    };
                }),
                fieldPosition: teamResults.map(t => {
                    let fieldPosition = fieldPositionResults.find(o => t.team == o.school);

                    return {
                        team: t.team,
                        averageStart: fieldPosition.avg_start_off,
                        averageStartingPredictedPoints: fieldPosition.avg_predicted_points_off
                    }
                })
            },
            players: {
                usage: playerResults.map(p => ({
                    player: p.name,
                    team: p.school,
                    position: p.position,
                    total: parseFloat(p.overall_usage),
                    quarter1: parseFloat(p.overall_usage_1),
                    quarter2: parseFloat(p.overall_usage_2),
                    quarter3: parseFloat(p.overall_usage_3),
                    quarter4: parseFloat(p.overall_usage_4),
                    rushing: parseFloat(p.rush_usage),
                    passing: parseFloat(p.pass_usage)
                })),
                ppa: playerResults.map(p => ({
                    player: p.name,
                    team: p.school,
                    position: p.position,
                    average: {
                        total: parseFloat(p.ppa),
                        quarter1: parseFloat(p.ppa_1),
                        quarter2: parseFloat(p.ppa_2),
                        quarter3: parseFloat(p.ppa_3),
                        quarter4: parseFloat(p.ppa_4),
                        rushing: parseFloat(p.ppa_rush),
                        passing: parseFloat(p.ppa_pass)
                    },
                    cumulative: {
                        total: parseFloat(p.cum_ppa),
                        quarter1: parseFloat(p.cum_ppa_1),
                        quarter2: parseFloat(p.cum_ppa_2),
                        quarter3: parseFloat(p.cum_ppa_3),
                        quarter4: parseFloat(p.cum_ppa_4),
                        rushing: parseFloat(p.cum_ppa_rush),
                        passing: parseFloat(p.cum_ppa_pass)
                    }
                }))
            }
        }
    };

    return {
        getTeamStats,
        getCategories,
        getAdvancedStats,
        getAdvancedGameStats,
        getAdvancedBoxScore
    };
};
