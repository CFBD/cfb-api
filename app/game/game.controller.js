module.exports = (db) => {
    return {
        getDrives: async (req, res) => {
            try {
                if (!req.query.year) {
                    req.status(400).send({
                        error: 'A year parameter must be specified.'
                    });

                    return;
                }

                let filter = 'WHERE g.season = $1';
                let params = [req.query.year];

                let index = 2;

                if (req.query.week) {
                    filter += ` AND g.week = ${index}`;
                    params.push(req.query.week);
                    index++;
                }

                if (req.query.offense) {
                    filter += ` AND LOWER(offense.school) = LOWER($${index})`;
                    params.push(req.query.offense);
                    index++;
                }

                if (req.query.defense) {
                    filter += ` AND LOWER(defense.school) = LOWER($${index})`;
                    params.push(req.query.defense);
                    index++;
                }

                let drives = await db.any(`
                    SELECT offense.school as offense, defense.school as defense, d.id, d.scoring, d.start_period, d.start_yardline, d.start_time, d.end_period, d.end_yardline, d.end_time, d.elapsed, d.plays, d.yards, dr.name as drive_result
                    FROM game g
                        INNER JOIN drive d ON g.id = d.game_id
                        INNER JOIN team offense ON d.offense_id = offense.id
                        INNER JOIN team defense ON d.defense_id = defense.id
                        INNER JOIN drive_result dr ON d.result_id = dr.id
                    ${filter}
                    ORDER BY d.id
                `, params);

                res.send(drives);
            } catch (err) {
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getPlays: async (req, res) => {

        }
    }
}