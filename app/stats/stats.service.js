module.exports = (db) => {
    const getTeamStats = async (year, team, conference) => {
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
                END as stat_type, SUM(CAST(split_part(stat.stat, '-', 2) AS INT)) as stat
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

    const getAdvancedStats = async (year, team, excludeGarbageTime) => {
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

        const results = await db.any(`
        WITH plays AS (
            SELECT  g.id,
                    g.season,
                    t.school,
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
                        WHEN p.scoring = true THEN true
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
                AVG(ppa) AS ppa,
                AVG(ppa) FILTER(WHERE down_type = 'standard') AS standard_down_ppa,
                AVG(ppa) FILTER(WHERE down_type = 'passing') AS passing_down_ppa,
                AVG(ppa) FILTER(WHERE play_type = 'Pass') AS passing_ppa,
                AVG(ppa) FILTER(WHERE play_type = 'Rush') AS rushing_ppa,
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
                AVG(ppa) FILTER(WHERE success = true AND play_type = 'Pass') AS pass_explosiveness
        FROM plays
        ${excludeGarbageTime == 'true' ? 'WHERE garbage_time = false' : ''}
        GROUP BY season, school, conference, o_d
        ORDER BY season, school, o_d
        `, params);

        let stats = [];
        let years = Array.from(new Set(results.map(r => r.season)));

        for (let year of years) {
            let teams = Array.from(new Set(results.filter(r => r.season == year).map(r => r.team)));

            let yearStats = teams.map(t => {
                let offense = results.find(r => r.season == year && r.team == t && r.unit == 'offense');
                let defense = results.find(r => r.season == year && r.team == t && r.unit == 'defense');

                return {
                    season: year,
                    team: t,
                    conference: offense.conference,
                    offense: {
                        ppa: parseFloat(offense.ppa),
                        successRate: parseFloat(offense.success_rate),
                        explosiveness: parseFloat(offense.explosiveness),
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
                            successRate: parseFloat(offense.rush_success_rate),
                            explosiveness: parseFloat(offense.rush_explosiveness)
                        },
                        passingPlays: {
                            rate: parseFloat(offense.passing_rate),
                            ppa: parseFloat(offense.passing_ppa),
                            successRate: parseFloat(offense.pass_success_rate),
                            explosiveness: parseFloat(offense.pass_explosiveness)
                        }
                    },
                    defense: {
                        ppa: parseFloat(defense.ppa),
                        successRate: parseFloat(defense.success_rate),
                        explosiveness: parseFloat(defense.explosiveness),
                        standardDowns: {
                            rate: parseFloat(defense.standard_down_rate),
                            ppa: parseFloat(defense.standard_down_ppa),
                            successRate: parseFloat(defense.standard_down_success_rate),
                            explosiveness: parseFloat(defense.standard_down_explosiveness)
                        },
                        passingDowns: {
                            rate: parseFloat(defense.passing_down_rate),
                            ppa: parseFloat(defense.passing_down_ppa),
                            successRate: parseFloat(defense.passing_down_success_rate),
                            explosiveness: parseFloat(defense.passing_down_explosiveness)
                        },
                        rushingPlays: {
                            rate: parseFloat(defense.rush_rate),
                            ppa: parseFloat(defense.rushing_ppa),
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

    const getAdvancedGameStats = async (year, team, week, opponent, excludeGarbageTime) => {
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

        const results = await db.any(`
        WITH plays AS (
            SELECT  g.id,
                    g.season,
                    g.week,
                    t.school,
                    t2.school AS opponent,
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
                        WHEN p.scoring = true THEN true
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
                AVG(ppa) AS ppa,
                AVG(ppa) FILTER(WHERE down_type = 'standard') AS standard_down_ppa,
                AVG(ppa) FILTER(WHERE down_type = 'passing') AS passing_down_ppa,
                AVG(ppa) FILTER(WHERE play_type = 'Pass') AS passing_ppa,
                AVG(ppa) FILTER(WHERE play_type = 'Rush') AS rushing_ppa,
                CAST((COUNT(*) FILTER(WHERE success = true)) AS NUMERIC) / COUNT(*) AS success_rate,
                AVG(ppa) FILTER(WHERE success = true) AS explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND down_type = 'standard')) AS NUMERIC) / COUNT(*) FILTER(WHERE down_type = 'standard') AS standard_down_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND down_type = 'standard') AS standard_down_explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND down_type = 'passing')) AS NUMERIC) / COUNT(*) FILTER(WHERE down_type = 'passing') AS passing_down_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND down_type = 'passing') AS passing_down_explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND play_type = 'Rush')) AS NUMERIC) / COUNT(*) FILTER(WHERE play_type = 'Rush') AS rush_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND play_type = 'Rush') AS rush_explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND play_type = 'Pass')) AS NUMERIC) / COUNT(*) FILTER(WHERE play_type = 'Pass') AS pass_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND play_type = 'Pass') AS pass_explosiveness
        FROM plays
        ${excludeGarbageTime == 'true' ? 'WHERE garbage_time = false' : ''}
        GROUP BY id, season, week, school, opponent, o_d
        ORDER BY id, season, week, school, opponent, o_d
        `, params);

        let stats = [];
        let ids = Array.from(new Set(results.map(r => r.id)));

        for (let id of ids) {
            let teams = Array.from(new Set(results.filter(r => r.id == id).map(r => r.team)));

            let gameStats = teams.map(t => {
                let offense = results.find(r => r.id == id && r.team == t && r.unit == 'offense');
                let defense = results.find(r => r.id == id && r.team == t && r.unit == 'defense');

                return {
                    gameId: id,
                    season: offense.year,
                    week: offense.week,
                    team: t,
                    opponent: offense.opponent,
                    offense: {
                        ppa: parseFloat(offense.ppa),
                        successRate: parseFloat(offense.success_rate),
                        explosiveness: parseFloat(offense.explosiveness),
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
                            successRate: parseFloat(offense.rush_success_rate),
                            explosiveness: parseFloat(offense.rush_explosiveness)
                        },
                        passingPlays: {
                            ppa: parseFloat(offense.passing_ppa),
                            successRate: parseFloat(offense.pass_success_rate),
                            explosiveness: parseFloat(offense.pass_explosiveness)
                        }
                    },
                    defense: {
                        ppa: parseFloat(defense.ppa),
                        successRate: parseFloat(defense.success_rate),
                        explosiveness: parseFloat(defense.explosiveness),
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
                            successRate: parseFloat(defense.rush_success_rate),
                            explosiveness: parseFloat(defense.rush_explosiveness)
                        },
                        passingPlays: {
                            ppa: parseFloat(defense.passing_ppa),
                            successRate: parseFloat(defense.pass_success_rate),
                            explosiveness: parseFloat(defense.pass_explosiveness)
                        }
                    }
                }
            });

            stats = [
                ...stats,
                ...gameStats
            ];
        }

        return stats;
    };

    const getAdvancedBoxScore = async (id) => {
        const teamResults = await db.any(`
            WITH plays AS (
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
                            WHEN p.scoring = true THEN true
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
                        p.ppa AS ppa
                FROM game AS g
                    INNER JOIN drive AS d ON g.id = d.game_id
                    INNER JOIN play AS p ON d.id = p.drive_id AND p.ppa IS NOT NULL
                    INNER JOIN team AS t ON p.offense_id = t.id
                WHERE g.id = $1
            )
            SELECT 	school AS team,
                    ROUND(CAST(AVG(ppa) AS NUMERIC), 4) AS ppa,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE period = 1) AS NUMERIC), 4) AS ppa_1,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE period = 2) AS NUMERIC), 4) AS ppa_2,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE period = 3) AS NUMERIC), 4) AS ppa_3,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE period = 4) AS NUMERIC), 4) AS ppa_4,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass') AS NUMERIC), 4) AS passing_ppa,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass' AND period = 1) AS NUMERIC), 4) AS passing_ppa_1,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass' AND period = 2) AS NUMERIC), 4) AS passing_ppa_2,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass' AND period = 3) AS NUMERIC), 4) AS passing_ppa_3,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Pass' AND period = 4) AS NUMERIC), 4) AS passing_ppa_4,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush') AS NUMERIC), 4) AS rushing_ppa,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush' AND period = 1) AS NUMERIC), 4) AS rushing_ppa_1,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush' AND period = 2) AS NUMERIC), 4) AS rushing_ppa_2,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush' AND period = 3) AS NUMERIC), 4) AS rushing_ppa_3,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE play_type = 'Rush' AND period = 4) AS NUMERIC), 4) AS rushing_ppa_4,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true)) AS NUMERIC) / COUNT(*), 3) AS success_rate,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 1)) AS NUMERIC) / COUNT(*) FILTER(WHERE period = 1), 3) AS success_rate_1,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 2)) AS NUMERIC) / COUNT(*) FILTER(WHERE period = 2), 3) AS success_rate_2,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 3)) AS NUMERIC) / COUNT(*) FILTER(WHERE period = 3), 3) AS success_rate_3,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 4)) AS NUMERIC) / COUNT(*) FILTER(WHERE period = 4), 3) AS success_rate_4,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND down_type = 'standard')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE down_type = 'standard'), 0), 1), 3) AS standard_success_rate,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 1 AND down_type = 'standard')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 1 AND down_type = 'standard'), 0), 1), 3) AS standard_success_rate_1,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 2 AND down_type = 'standard')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 2 AND down_type = 'standard'), 0), 1), 3) AS standard_success_rate_2,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 3 AND down_type = 'standard')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 3 AND down_type = 'standard'), 0), 1), 3) AS standard_success_rate_3,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 4 AND down_type = 'standard')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 4 AND down_type = 'standard'), 0), 1), 3) AS standard_success_rate_4,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND down_type = 'passing')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE down_type = 'passing'), 0), 1), 3) AS passing_success_rate,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 1 AND down_type = 'passing')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 1 AND down_type = 'passing'), 0), 1), 3) AS passing_success_rate_1,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 2 AND down_type = 'passing')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 2 AND down_type = 'passing'), 0), 1), 3) AS passing_success_rate_2,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 3 AND down_type = 'passing')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 3 AND down_type = 'passing'), 0), 1), 3) AS passing_success_rate_3,
                    ROUND(CAST((COUNT(*) FILTER(WHERE success = true AND period = 4 AND down_type = 'passing')) AS NUMERIC) / COALESCE(NULLIF(COUNT(*) FILTER(WHERE period = 4 AND down_type = 'passing'), 0), 1), 3) AS passing_success_rate_4,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE success = true) AS NUMERIC), 2) AS explosiveness,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE success = true AND period = 1) AS NUMERIC), 2) AS explosiveness_1,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE success = true AND period = 2) AS NUMERIC), 2) AS explosiveness_2,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE success = true AND period = 3) AS NUMERIC), 2) AS explosiveness_3,
                    ROUND(CAST(AVG(ppa) FILTER(WHERE success = true AND period = 4) AS NUMERIC), 2) AS explosiveness_4,
                    COUNT(*) AS plays,
                    COUNT(*) FILTER(WHERE period = 1) AS plays_1,
                    COUNT(*) FILTER(WHERE period = 2) AS plays_2,
                    COUNT(*) FILTER(WHERE period = 3) AS plays_3,
                    COUNT(*) FILTER(WHERE period = 4) AS plays_4
            FROM plays
            GROUP BY school
        `, [id]);

        const playerResults = await db.any(`
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
                }))
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