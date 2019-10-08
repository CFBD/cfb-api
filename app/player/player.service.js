module.exports = (db) => {

    const playerSearch = async (active, school, position, searchTerm) => {
        let filter = 'WHERE a.active = $1';
        let params = [active === false ? false : true];
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
    }

    return {
        playerSearch
    };
};
