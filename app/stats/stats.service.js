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
                INNER JOIN drive AS d ON g.id = d.game_id
                INNER JOIN play AS p ON d.id = p.drive_id AND p.ppa IS NOT NULL
            ${filter}
        )
        SELECT 	season,
                school AS team,
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
                CAST((COUNT(*) FILTER(WHERE success = true AND play_type = 'Rush')) AS NUMERIC) / COUNT(*) FILTER(WHERE down_type = 'standard') AS rush_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND play_type = 'Rush') AS rush_explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND play_type = 'Pass')) AS NUMERIC) / COUNT(*) FILTER(WHERE down_type = 'passing') AS pass_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND play_type = 'Pass') AS pass_explosiveness
        FROM plays
        ${excludeGarbageTime == 'true' ? 'WHERE garbage_time = false' : ''}
        GROUP BY season, school, o_d
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
                        WHEN p.success = true THEN true
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
                CAST((COUNT(*) FILTER(WHERE success = true AND play_type = 'Rush')) AS NUMERIC) / COUNT(*) FILTER(WHERE down_type = 'standard') AS rush_success_rate,
                AVG(ppa) FILTER(WHERE success = true AND play_type = 'Rush') AS rush_explosiveness,
                CAST((COUNT(*) FILTER(WHERE success = true AND play_type = 'Pass')) AS NUMERIC) / COUNT(*) FILTER(WHERE down_type = 'passing') AS pass_success_rate,
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

    return {
        getTeamStats,
        getCategories,
        getAdvancedStats,
        getAdvancedGameStats
    };
};