module.exports = (db) => {
    return {
        getPlays: async (req, res) => {
            try {
                if (!req.query.year) {
                    res.status(400).send({
                        error: 'A year parameter must be specified.'
                    });

                    return;
                }

                let filter = 'WHERE g.season = $1';
                let params = [req.query.year];

                let index = 2;

                if (req.query.seasonType != 'both') {
                    filter += ` AND g.season_type = $${index}`;
                    params.push(req.query.seasonType || 'regular');
                    index++;
                }

                if (req.query.week) {
                    filter += ` AND g.week = $${index}`;
                    params.push(req.query.week);
                    index++;
                }

                if (req.query.team) {
                    filter += ` AND (LOWER(offense.school) = LOWER($${index}) OR LOWER(defense.school) = LOWER($${index}))`;
                    params.push(req.query.team);
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

                if (req.query.offenseConference) {
                    filter += ` AND LOWER(oc.abbreviation) = LOWER($${index})`;
                    params.push(req.query.offenseConference);
                    index++;
                }

                if (req.query.defenseConference) {
                    filter += ` AND LOWER(dc.abbreviation) = LOWER($${index})`;
                    params.push(req.query.defenseConference);
                    index++;
                }

                if (req.query.conference) {
                    filter += ` AND (LOWER(oc.abbreviation) = LOWER($${index}) OR LOWER(dc.abbreviation) = LOWER($${index}))`;
                    params.push(req.query.conference);
                    index++;
                }

                if (req.query.playType) {
                    filter += ` AND pt.id = $${index}`;
                    params.push(req.query.playType);
                    index++;
                }

                if (params.length < 3 && req.query.seasonType != 'both') {
                    res.status(400).send({
                        error: 'Either a week, a team, an offensive team, or a defensive team must be specified.'
                    });

                    return;
                }

                let plays = await db.any(`
                    SELECT  p.id,
                            offense.school as offense,
                            oc.name as offense_conference,
                            defense.school as defense,
                            dc.name as defense_conference,
                            CASE WHEN ogt.home_away = 'home' THEN p.home_score ELSE p.away_score END AS offense_score,
                            CASE WHEN dgt.home_away = 'home' THEN p.home_score ELSE p.away_score END AS defense_score,
                            d.id as drive_id,
                            p.period,
                            p.clock,
                            p.yard_line,
                            p.down,
                            p.distance,
                            p.yards_gained,
                            pt.text as play_type,
                            p.play_text
                    FROM game g
                        INNER JOIN drive d ON g.id = d.game_id
                        INNER JOIN play p ON d.id = p.drive_id
                        INNER JOIN team offense ON p.offense_id = offense.id
                        LEFT JOIN conference_team oct ON offense.id = oct.team_id AND oct.start_year >= g.season AND (oct.end_year <= g.season OR oct.end_year IS NULL)
                        LEFT JOIN conference oc ON oct.conference_id = oc.id
                        INNER JOIN team defense ON p.defense_id = defense.id
                        LEFT JOIN conference_team dct ON defense.id = dct.team_id AND dct.start_year >= g.season AND (dct.end_year <= g.season OR dct.end_year IS NULL)
                        LEFT JOIN conference dc ON dct.conference_id = dc.id
                        INNER JOIN game_team ogt ON ogt.game_id = g.id AND ogt.team_id = offense.id 
                        INNER JOIN game_team dgt ON dgt.game_id = g.id AND dgt.team_id = defense.id
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
        },
        getPlayTypes: async (req, res) => {
            try {
                let types = await db.any(`
                        SELECT id, text, abbreviation
                        FROM play_type
                    `);

                res.send(types);
            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        }
    }
}