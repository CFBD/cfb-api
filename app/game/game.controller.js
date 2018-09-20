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
                    console.error(err);
                    res.status(500).send({
                        error: 'Something went wrong.'
                    });
                }
            },
            getPlays: async (req, res) => {
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

                    if (params.length < 2) {
                        req.status(400).send({
                            error: 'Either a week, an offensive team, or a defensive team must be specified.'
                        });

                        return;
                    }

                    let plays = await db.any(`
                        SELECT offense.school as offense, defense.school as defense, d.id as drive_id, p.period, p.clock, p.yard_line, p.down, p.distance, p.yards_gained,  pt.text as play_type, p.play_text
                        FROM game g
                            INNER JOIN drive d ON g.id = d.game_id
                            INNER JOIN play p ON d.id = p.drive_id
                            INNER JOIN team offense ON p.offense_id = offense.id
                            INNER JOIN team defense ON p.defense_id = defense.id
                            INNER JOIN play_type pt ON p.play_type_id = pt.id
                        ${filter}
                        ORDER BY d.id
                `, params);

                    res.send(plays);
                } catch (err) {
                    console.error(err);
                    res.status(500).send({
                        error: 'Something went wrong.'
                    });
                }
            }
    }
}