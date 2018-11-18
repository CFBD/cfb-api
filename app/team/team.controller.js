module.exports = (db) => {
    return {
        getTeams: async (req, res) => {
            try {
                let filter = req.query.conference ? 'WHERE LOWER(c.abbreviation) = LOWER($1)' : '';
                let params = [req.query.conference];

                let teams = await db.any(`
                    SELECT t.school, t.mascot, t.abbreviation, c.name as conference, ct.division as division, ('#' || t.color) as color, ('#' || t.alt_color) as alt_color, t.images as logos
                    FROM team t
                        LEFT JOIN conference_team ct ON t.id = ct.team_id
                        LEFT JOIN  conference c ON c.id = ct.conference_id
                    ${filter}
                    ORDER BY t.active DESC, t.school
                `, params);

                res.send(teams);
            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getRoster: async (req, res) => {
            try {
                if (!req.query.team) {
                    res.status(400).send({
                        error: 'A team must be specified.'
                    });
                    return;
                }

                let roster = await db.any(`
                    SELECT a.id, a.first_name, a.last_name, a.weight, a.height, a.jersey, a.year, p.abbreviation as position, h.city as home_city, h.state as home_state, h.country as home_country
                    FROM team t
                        INNER JOIN athlete a ON t.id = a.team_id AND a.active = true
                        INNER JOIN hometown h ON a.hometown_id = h.id
                        INNER JOIN position p ON a.position_id = p.id
                    WHERE LOWER(t.school) = LOWER($1)
                `, [req.query.team]);

                res.send(roster);

            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getConferences: async (req, res) => {
            try {
                let conferences = await db.any(`
                    SELECT id, name, short_name, abbreviation
                    FROM conference
                    ORDER BY id
                `);

                res.send(conferences);
            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getTeamTalent: async (req, res) => {
            try {
                let filter = req.query.year ? 'WHERE tt.year = $1' : '';
                let params = req.query.year ? [req.query.year] : [];

                let talent = await db.any(`
                    SELECT tt.year, t.school, tt.talent
                    FROM team_talent tt
                        INNER JOIN team t ON tt.team_id = t.id
                    ${filter}
                    ORDER BY tt.year DESC, tt.talent DESC
                `, params);

                res.send(talent);
            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        }
    }
}