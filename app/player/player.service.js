module.exports = (db) => {

    const playerSearch = async (active, school, position, searchTerm) => {
        let filter = 'WHERE a.active = $1';
        let params = [active == "false" ? false : true];
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
        SELECT a.id, t.school, a.name, a.first_name, a.last_name, a.weight, a.height, a.jersey, p.abbreviation AS "position", h.city || ', ' || h.state AS hometown, '#' || t.color AS color
        FROM athlete AS a
            INNER JOIN team AS t ON a.team_id = t.id
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
            teamColor: r.color
        }));
    };

    const getMeanPassingChartData = async (id) => {
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
                WHERE g.season = 2019 AND a.id = $1
            ), grouped AS (
                SELECT p1.row_num, p2.ppa
                FROM plays AS p1
                    INNER JOIN plays AS p2 ON p2.row_num <= p1.row_num
            )
            SELECT row_num, AVG(ppa) AS avg_ppa
            FROM grouped
            GROUP BY row_num
            ORDER BY row_num
        `, [id]);

        return results.map(r => ({ playNumber: parseInt(r.row_num), avgPPA: r.avg_ppa }));
    };

    return {
        playerSearch,
        getMeanPassingChartData
    };
};
