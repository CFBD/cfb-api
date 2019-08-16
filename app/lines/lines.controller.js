module.exports = (db) => {

    const getLines = async (req, res) => {
        try {
            if (!req.query.year || isNaN(req.query.year)) {
                res.status(400).send({
                    error: 'A numeric year parameter must be specified.'
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
                if (isNaN(req.query.week)) {
                    res.status(400).send({
                        error: 'Week parameter must be numeric'
                    });

                    return;
                }
                
                filter += ` AND g.week = $${index}`;
                params.push(req.query.week);
                index++;
            }

            if (req.query.team) {
                filter += ` AND (LOWER(awt.school) = LOWER($${index}) OR LOWER(ht.school) = LOWER($${index}))`;
                params.push(req.query.team);
                index++;
            }

            if (req.query.home) {
                filter += ` AND LOWER(ht.school) = LOWER($${index})`;
                params.push(req.query.home);
                index++;
            }

            if (req.query.away) {
                filter += ` AND LOWER(awt.school) = LOWER($${index})`;
                params.push(req.query.away);
                index++;
            }

            if (req.query.conference) {
                filter += ` AND (LOWER(hc.abbreviation) = LOWER($${index}) OR LOWER(ac.abbreviation) = LOWER($${index}))`;
                params.push(req.query.conference);
                index++;
            }

            let games = await db.any(`
                SELECT g.id, ht.school AS home_team, hgt.points AS home_score, awt.school AS away_team, agt.points AS away_score
                FROM game AS g
                    INNER JOIN game_team AS hgt ON hgt.game_id = g.id AND hgt.home_away = 'home'
                    INNER JOIN team AS ht ON hgt.team_id = ht.id
                    LEFT JOIN conference_team hct ON ht.id = hct.team_id AND hct.start_year <= g.season AND (hct.end_year >= g.season OR hct.end_year IS NULL)
                    LEFT JOIN conference hc ON hct.conference_id = hc.id
                    INNER JOIN game_team AS agt ON agt.game_id = g.id AND agt.home_away = 'away'
                    INNER JOIN team AS awt ON agt.team_id = awt.id
                    LEFT JOIN conference_team act ON awt.id = act.team_id AND act.start_year <= g.season AND (act.end_year >= g.season OR act.end_year IS NULL)
                    LEFT JOIN conference ac ON act.conference_id = ac.id
                ${filter}
            `, params);

            let gameIds = games.map(g => g.id);

            let lines = await db.any(`
                SELECT g.id, p.name, gl.spread, gl.over_under
                FROM game AS g
                    INNER JOIN game_lines AS gl ON g.id = gl.game_id
                    INNER JOIN lines_provider AS p ON gl.lines_provider_id = p.id
                WHERE g.id IN ($1:list)
            `, [gameIds]);

            let results = games.map(g => {
                let gameLines = lines
                                    .filter(l => l.id == g.id)
                                    .map(l => ({
                                        provider: l.name,
                                        spread: l.spread,
                                        formattedSpread: l.spread < 0 ? `${g.home_team} ${l.spread}` : `${g.away_team} -${l.spread}`,
                                        overUnder: l.over_under
                                    }));

                return {
                    id: g.id,
                    homeTeam: g.home_team,
                    homeScore: g.home_score,
                    awayTeam: g.away_team,
                    awayScore: g.away_score,
                    lines: gameLines
                };
            });

            res.send(results);
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    return {
        getLines
    };
};
