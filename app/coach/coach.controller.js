module.exports = (db) => {
    return {
        getCoaches: async (req, res) => {
            try {
                let filter = '';
                let params = [];
                let index = 1;

                if (req.query.firstName) {
                    filter += `${index == 1 ? 'WHERE' : ' AND'} LOWER(c.first_name) = LOWER($${index})`;
                    params.push(req.query.firstName);
                    index++;
                }

                if (req.query.lastName) {
                    filter += `${index == 1 ? 'WHERE' : ' AND'} LOWER(c.last_name) = LOWER($${index})`;
                    params.push(req.query.lastName);
                    index++;
                }

                if (req.query.team) {
                    filter += `${index == 1 ? 'WHERE' : ' AND'} LOWER(t.school) = LOWER($${index})`;
                    params.push(req.query.team);
                    index++;
                }

                if (req.query.year) {
                    filter += `${index == 1 ? 'WHERE' : ' AND'} cs.year = $${index}`;
                    params.push(req.query.year);
                    index++;
                }

                if (req.query.minYear) {
                    filter += `${index == 1 ? 'WHERE' : ' AND'} cs.year >= $${index}`;
                    params.push(req.query.minYear);
                    index++;
                }


                if (req.query.maxYear) {
                    filter += `${index == 1 ? 'WHERE' : ' AND'} cs.year <= $${index}`;
                    params.push(req.query.maxYear);
                    index++;
                }

                let results = await db.any(`
                    SELECT c.id, c.first_name, c.last_name, t.school, cs.year, cs.games, cs.wins, cs.losses, cs.ties, cs.preseason_rank, cs.postseason_rank
                    FROM coach c
                        INNER JOIN coach_season cs ON c.id = cs.coach_id
                        INNER JOIN team t ON cs.team_id = t.id
                    ${filter}
                    ORDER BY c.last_name, c.first_name, cs.year
                `, params);

                let coaches = [];
                let ids = Array.from(new Set(results.map(r => r.id)));
                for (let id of ids) {
                    let coachSeasons = results.filter(r => r.id == id);

                    coaches.push({
                        first_name: coachSeasons[0].first_name,
                        last_name: coachSeasons[0].last_name,
                        seasons: coachSeasons.map(cs => {
                            return {
                                school: cs.school,
                                year: cs.year,
                                games: cs.games,
                                wins: cs.wins,
                                losses: cs.losses,
                                ties: cs.ties,
                                preseason_rank: cs.preseason_rank,
                                postseason_rank: cs.postseason_rank
                            }
                        })
                    });
                }

                res.send(coaches);

            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        }
    }
}