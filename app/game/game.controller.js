module.exports = (db) => {
    return {
        getGames: async (req, res) => {
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
                    filter += ` AND (LOWER(away.school) = LOWER($${index}) OR LOWER(home.school) = LOWER($${index}))`;
                    params.push(req.query.team);
                    index++;
                }

                if (req.query.home) {
                    filter += ` AND LOWER(home.school) = LOWER($${index})`;
                    params.push(req.query.home);
                    index++;
                }

                if (req.query.away) {
                    filter += ` AND LOWER(away.school) = LOWER($${index})`;
                    params.push(req.query.away);
                    index++;
                }

                if (req.query.conference) {
                    filter += ` AND (LOWER(hc.abbreviation) = LOWER($${index}) OR LOWER(ac.abbreviation) = LOWER($${index}))`;
                    params.push(req.query.conference);
                    index++;
                }

                let games = await db.any(`
                    SELECT g.id, g.season, g.week, g.season_type, g.start_date, g.neutral_site, g.conference_game, g.attendance, v.id as venue_id, v.name as venue, home.school as home_team, hc.name as home_conference, gt.points as home_points, gt.line_scores as home_line_scores, away.school as away_team, ac.name as away_conference, gt2.points as away_points, gt2.line_scores as away_line_scores
                    FROM game g
                        INNER JOIN game_team gt ON g.id = gt.game_id AND gt.home_away = 'home'
                        INNER JOIN team home ON gt.team_id = home.id
                        LEFT JOIN conference_team hct ON home.id = hct.team_id AND hct.start_year >= g.season AND (hct.end_year <= g.season OR hct.end_year IS NULL)
                        LEFT JOIN conference hc ON hct.conference_id = hc.id
                        INNER JOIN game_team gt2 ON g.id = gt2.game_id AND gt2.home_away = 'away'
                        INNER JOIN team away ON gt2.team_id = away.id
                        LEFT JOIN conference_team act ON away.id = act.team_id AND act.start_year >= g.season AND (act.end_year <= g.season OR act.end_year IS NULL)
                        LEFT JOIN conference ac ON act.conference_id = ac.id
                        LEFT JOIN venue v ON g.venue_id = v.id
                    ${filter}
                    ORDER BY g.season, g.week, g.start_date
            `, params);

                res.send(games);
            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getDrives: async (req, res) => {
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

                let drives = await db.any(`
                            SELECT offense.school as offense, oc.name as offense_conference, defense.school as defense, dc.name as defense_conference, g.id as game_id, d.id, d.scoring, d.start_period, d.start_yardline, d.start_time, d.end_period, d.end_yardline, d.end_time, d.elapsed, d.plays, d.yards, dr.name as drive_result
                            FROM game g
                                INNER JOIN drive d ON g.id = d.game_id
                                INNER JOIN team offense ON d.offense_id = offense.id
                                LEFT JOIN conference_team oct ON offense.id = oct.team_id AND oct.start_year >= g.season AND (oct.end_year <= g.season OR oct.end_year IS NULL)
                                LEFT JOIN conference oc ON oct.conference_id = oc.id
                                INNER JOIN team defense ON d.defense_id = defense.id
                                LEFT JOIN conference_team dct ON defense.id = dct.team_id AND dct.start_year >= g.season AND (dct.end_year <= g.season OR dct.end_year IS NULL)
                                LEFT JOIN conference dc ON dct.conference_id = dc.id
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
        getTeamStats: async (req, res) => {
            try {
                if (!req.query.gameId && !(req.query.year && (req.query.week || req.query.team || req.query.conference))) {
                    res.status(400).send({
                        error: 'Must specify a gameId or a year with either a week, team, or conference.'
                    });

                    return;
                }

                let filter;
                let params;

                if (req.query.gameId) {
                    filter = 'WHERE g.id = $1';
                    params = [req.query.gameId];
                } else {
                    filter = 'WHERE g.season_type = $1';
                    params = [req.query.seasonType || 'regular'];

                    let index = 2;

                    if (req.query.year) {
                        filter += ` AND g.season = $${index}`;
                        params.push(req.query.year);
                        index++;
                    }

                    if (req.query.week) {
                        filter += ` AND g.week = $${index}`;
                        params.push(req.query.week);
                        index++;
                    }

                    if (req.query.team) {
                        filter += ` AND (LOWER(t.school) = LOWER($${index}) OR LOWER(t2.school) = LOWER($${index}))`;
                        params.push(req.query.team);
                        index++;
                    }

                    if (req.query.conference) {
                        filter += ` AND (LOWER(c.abbreviation) = LOWER($${index}) OR LOWER(c2.abbreviation) = LOWER($${index}))`;
                        params.push(req.query.conference);
                        index++;
                    }
                }

                let data = await db.any(`
                                SELECT g.id, gt.home_away, t.school, c.name as conference, gt.points, tst.name, gts.stat
                                FROM team t
                                    INNER JOIN game_team gt ON t.id = gt.team_id
                                    INNER JOIN game g ON gt.game_id = g.id
                                    LEFT JOIN conference_team ct ON t.id = ct.team_id AND ct.start_year >= g.season AND (ct.end_year <= g.season OR ct.end_year IS NULL)
                                    LEFT JOIN conference c ON ct.conference_id = c.id
                                    INNER JOIN game_team gt2 ON g.id = gt2.game_id AND gt2.id <> gt.id
                                    INNER JOIN team t2 ON gt2.team_id = t2.id
                                    LEFT JOIN conference_team ct2 ON t2.id = ct2.team_id AND ct2.start_year >= g.season AND (ct2.end_year <= g.season OR ct2.end_year IS NULL)
                                    LEFT JOIN conference c2 ON ct2.conference_id = c2.id
                                    INNER JOIN game_team_stat gts ON gts.game_team_id = gt.id
                                    INNER JOIN team_stat_type tst ON gts.type_id = tst.id
                                ${filter}
                            `, params);

                let stats = [];

                let ids = Array.from(new Set(data.map(d => d.id)));
                for (let id of ids) {
                    let game = {
                        id,
                        teams: []
                    }

                    let gameStats = data.filter(d => d.id == id);
                    let gameTeams = Array.from(new Set(gameStats.map(gs => gs.school)));

                    for (let team of gameTeams) {
                        let teamStats = gameStats.filter(gs => gs.school == team);

                        game.teams.push({
                            school: team,
                            conference: teamStats[0].conference,
                            homeAway: teamStats[0].home_away,
                            points: teamStats[0].points,
                            stats: teamStats.map(ts => {
                                return {
                                    category: ts.name,
                                    stat: ts.stat
                                }
                            })
                        });
                    }

                    stats.push(game);
                }

                res.send(stats);

            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getPlayerStats: async (req, res) => {
            try {
                if (!req.query.gameId && !(req.query.year && (req.query.week || req.query.team || req.query.conference))) {
                    res.status(400).send({
                        error: 'Must specify a gameId or a year with either a week, team, or conference.'
                    });

                    return;
                }

                let filter;
                let params;

                if (req.query.gameId) {
                    filter = 'WHERE g.id = $1';
                    params = [req.query.gameId];
                } else {
                    filter = 'WHERE g.season_type = $1';
                    params = [req.query.seasonType || 'regular'];

                    let index = 2;

                    if (req.query.year) {
                        filter += ` AND g.season = $${index}`;
                        params.push(req.query.year);
                        index++;
                    }

                    if (req.query.week) {
                        filter += ` AND g.week = $${index}`;
                        params.push(req.query.week);
                        index++;
                    }

                    if (req.query.team) {
                        filter += ` AND (LOWER(t.school) = LOWER($${index}) OR LOWER(t2.school) = LOWER($${index}))`;
                        params.push(req.query.team);
                        index++;
                    }

                    if (req.query.conference) {
                        filter += ` AND (LOWER(c.abbreviation) = LOWER($${index}) OR LOWER(c2.abbreviation) = LOWER($${index}))`;
                        params.push(req.query.conference);
                        index++;
                    }

                    if (req.query.category) {
                        filter += ` AND LOWER(cat.name) = LOWER($${index})`;
                        params.push(req.query.category);
                        index++;
                    }
                }

                let data = await db.any(`
                                SELECT g.id, gt.home_away, t.school, c.name as conference, gt.points, cat.name as cat, typ.name as typ, a.id as athlete_id, a.name as athlete, gps.stat
                                FROM team t
                                    INNER JOIN game_team gt ON t.id = gt.team_id
                                    INNER JOIN game g ON gt.game_id = g.id
                                    LEFT JOIN conference_team ct ON t.id = ct.team_id AND ct.start_year >= g.season AND (ct.end_year <= g.season OR ct.end_year IS NULL)
                                    LEFT JOIN conference c ON ct.conference_id = c.id
                                    INNER JOIN game_team gt2 ON g.id = gt2.game_id AND gt2.id <> gt.id
                                    INNER JOIN team t2 ON gt2.team_id = t2.id
                                    LEFT JOIN conference_team ct2 ON t2.id = ct2.team_id AND ct2.start_year >= g.season AND (ct2.end_year <= g.season OR ct2.end_year IS NULL)
                                    LEFT JOIN conference c2 ON ct2.conference_id = c2.id
                                    INNER JOIN game_player_stat gps ON gps.game_team_id = gt.id
                                    INNER JOIN player_stat_category cat ON gps.category_id = cat.id
                                    INNER JOIN player_stat_type typ ON gps.type_id = typ.id
                                    INNER JOIN athlete a ON gps.athlete_id = a.id
                                    ${filter}
                            `, params);

                let stats = [];

                let ids = Array.from(new Set(data.map(d => d.id)));
                for (let id of ids) {
                    let game = {
                        id,
                        teams: []
                    }

                    let gameStats = data.filter(d => d.id == id);
                    let gameTeams = Array.from(new Set(gameStats.map(gs => gs.school)));

                    for (let team of gameTeams) {
                        let teamStats = gameStats.filter(gs => gs.school == team);
                        let teamRecord = {
                            school: team,
                            conference: teamStats[0].conference,
                            homeAway: teamStats[0].home_away,
                            points: teamStats[0].points,
                            categories: []
                        }

                        let categories = Array.from(new Set(teamStats.map(gs => gs.cat)));

                        for (let category of categories) {
                            let categoryStats = teamStats.filter(ts => ts.cat == category);
                            let categoryRecord = {
                                name: categoryStats[0].cat,
                                types: []
                            }

                            let types = Array.from(new Set(categoryStats.map(gs => gs.typ)));
                            for (let statType of types) {
                                let typeStats = categoryStats.filter(cs => cs.typ == statType);
                                categoryRecord.types.push({
                                    name: typeStats[0].typ,
                                    athletes: typeStats.map(ts => {
                                        return {
                                            id: ts.athlete_id,
                                            name: ts.athlete,
                                            stat: ts.stat
                                        }
                                    })
                                });
                            }

                            teamRecord.categories.push(categoryRecord);
                        }

                        game.teams.push(teamRecord);
                    }

                    stats.push(game);
                }

                res.send(stats);

            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        }
    }
}