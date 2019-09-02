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
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= 2013 AND (ct.end_year IS NULL OR ct.end_year >= 2013)
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
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= 2013 AND (ct.end_year IS NULL OR ct.end_year >= 2013)
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
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= 2013 AND (ct.end_year IS NULL OR ct.end_year >= 2013)
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
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= 2013 AND (ct.end_year IS NULL OR ct.end_year >= 2013)
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
            INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= 2013 AND (ct.end_year IS NULL OR ct.end_year >= 2013)
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
    }

    return {
        getTeamStats
    };
};
