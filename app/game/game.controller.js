const serviceConstructor = require('./game.service');

module.exports = (db, Sentry) => {
    const service = serviceConstructor(db);

    return {
        getGames: async (req, res) => {
            try {
                let filter = '';
                let params = [];
                if (!req.query.id) {
                    if (!req.query.year || isNaN(req.query.year)) {
                        res.status(400).send({
                            error: 'A numeric year parameter must be specified.'
                        });

                        return;
                    } else if (req.query.division && !['fbs', 'fcs', 'ii', 'iii'].includes(req.query.division.toLowerCase())) {
                        res.status(400).send({
                            error: 'Invalid division. Division must be one of: fbs, fcs, ii, iii.'
                        });

                        return;
                    }

                    filter = 'WHERE g.season = $1';
                    params = [req.query.year];

                    let index = 2;

                    if (req.query.seasonType != 'both') {
                        if (req.query.seasonType && req.query.seasonType != 'regular' && req.query.seasonType != 'postseason' && req.query.seasonType != 'both') {
                            res.status(400).send({
                                error: 'Invalid season type'
                            });

                            return;
                        }

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

                    if (req.query.division) {
                        filter += ` AND (hc.division = $${index} OR ac.division = $${index})`;
                        params.push(req.query.division.toLowerCase());
                        index++;
                    }
                } else {
                    filter = 'WHERE g.id = $1';
                    params = [req.query.id];
                }

                let games = await db.any(`
                    SELECT g.id, g.season, g.week, g.season_type, g.start_date, g.start_time_tbd, (g.status = 'completed') AS completed, g.neutral_site, g.conference_game, g.attendance, v.id as venue_id, v.name as venue, home.id as home_id, home.school as home_team, hc.name as home_conference, hc.division as home_division, gt.points as home_points, gt.line_scores as home_line_scores, gt.win_prob AS home_post_win_prob, gt.start_elo AS home_pregame_elo, gt.end_elo AS home_postgame_elo, away.id AS away_id, away.school as away_team, ac.name as away_conference, ac.division as away_division, gt2.points as away_points, gt2.line_scores as away_line_scores, gt2.win_prob AS away_post_win_prob, gt2.start_elo AS away_pregame_elo, gt2.end_elo AS away_postgame_elo, g.excitement as excitement_index, 'https://www.youtube.com/watch?v=' || g.highlights AS highlights, g.notes
                    FROM game g
                        INNER JOIN game_team gt ON g.id = gt.game_id AND gt.home_away = 'home'
                        INNER JOIN team home ON gt.team_id = home.id
                        LEFT JOIN conference_team hct ON home.id = hct.team_id AND (hct.start_year IS NULL OR hct.start_year <= g.season) AND (hct.end_year >= g.season OR hct.end_year IS NULL)
                        LEFT JOIN conference hc ON hct.conference_id = hc.id
                        INNER JOIN game_team gt2 ON g.id = gt2.game_id AND gt2.home_away = 'away'
                        INNER JOIN team away ON gt2.team_id = away.id
                        LEFT JOIN conference_team act ON away.id = act.team_id AND (act.start_year IS NULL OR act.start_year <= g.season) AND (act.end_year >= g.season OR act.end_year IS NULL)
                        LEFT JOIN conference ac ON act.conference_id = ac.id
                        LEFT JOIN venue v ON g.venue_id = v.id
                    ${filter}
                    ORDER BY g.season, g.week, g.start_date
            `, params);

                res.send(games);
            } catch (err) {
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getDrives: async (req, res) => {
            try {
                if (!req.query.year || isNaN(req.query.year)) {
                    res.status(400).send({
                        error: 'A numeric year parameter must be specified.'
                    });
                } else if (req.query.seasonType && req.query.seasonType != 'regular' && req.query.seasonType != 'postseason' && req.query.seasonType != 'both') {
                    res.status(400).send({
                        error: 'Invalid season type'
                    });
                } else if (req.query.week && !parseInt(req.query.week)) {
                    res.status(400).send({
                        error: 'Week parameter must be numeric.'
                    });
                } else {
                    const drives = await service.getDrives(req.query.year, req.query.seasonType, req.query.week, req.query.team, req.query.offense, req.query.defense, req.query.offenseConference, req.query.defenseConference, req.query.conference, req.query.classification);
                    res.send(drives);
                }
            } catch (err) {
                Sentry.captureException(err);
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
                    if (isNaN(req.query.gameId)) {
                        res.status(400).send({
                            error: 'GameId must be numeric.'
                        });

                        return;
                    }

                    filter = 'WHERE g.id = $1';
                    params = [req.query.gameId];
                } else {
                    if (req.query.seasonType && req.query.seasonType != 'regular' && req.query.seasonType != 'postseason' && req.query.seasonType != 'both') {
                        res.status(400).send({
                            error: 'Invalid season type'
                        });

                        return;
                    }

                    filter = 'WHERE g.season_type = $1';
                    params = [req.query.seasonType || 'regular'];

                    let index = 2;

                    if (req.query.year) {
                        if (isNaN(req.query.year)) {
                            res.status(400).send({
                                error: 'Year must be numeric.'
                            });

                            return;
                        }

                        filter += ` AND g.season = $${index}`;
                        params.push(req.query.year);
                        index++;
                    }

                    if (req.query.week) {
                        if (isNaN(req.query.week)) {
                            res.status(400).send({
                                error: 'Week must be numeric.'
                            });

                            return;
                        }

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

                    if (req.query.classification) {
                        filter += ` AND (c.division = $${index} OR c2.division = $${index})`;
                        params.push(req.query.classification.toLowerCase());
                        index++;
                    }
                }

                let data = await db.any(`
                                SELECT g.id, gt.home_away, t.school, c.name as conference, gt.points, tst.name, gts.stat
                                FROM team t
                                    INNER JOIN game_team gt ON t.id = gt.team_id
                                    INNER JOIN game g ON gt.game_id = g.id
                                    LEFT JOIN conference_team ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year >= g.season OR ct.end_year IS NULL)
                                    LEFT JOIN conference c ON ct.conference_id = c.id
                                    INNER JOIN game_team gt2 ON g.id = gt2.game_id AND gt2.id <> gt.id
                                    INNER JOIN team t2 ON gt2.team_id = t2.id
                                    LEFT JOIN conference_team ct2 ON t2.id = ct2.team_id AND ct2.start_year <= g.season AND (ct2.end_year >= g.season OR ct2.end_year IS NULL)
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
                Sentry.captureException(err);
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
                    if (isNaN(req.query.gameId)) {
                        res.status(400).send({
                            error: 'gameId must be numeric.'
                        });

                        return;
                    }

                    filter = 'g.id = $1';
                    params = [req.query.gameId];
                } else {
                    if (req.query.seasonType && req.query.seasonType != 'regular' && req.query.seasonType != 'postseason' && req.query.seasonType != 'both') {
                        res.status(400).send({
                            error: 'Invalid season type'
                        });

                        return;
                    }

                    filter = '';
                    params = [];

                    let index = 1;

                    if (req.query.seasonType && req.query.seasonType != 'both') {
                        filter += ` AND g.season_type = $${index}`;
                        params.push(req.query.seasonType);
                        index++;
                    }

                    if (req.query.year) {
                        if (isNaN(req.query.year)) {
                            res.status(400).send({
                                error: 'Year param must be numeric.'
                            });

                            return;
                        }

                        filter += ` AND g.season = $${index}`;
                        params.push(req.query.year);
                        index++;
                    }

                    if (req.query.week) {
                        if (isNaN(req.query.week)) {
                            res.status(400).send({
                                error: 'Week param must be numeric.'
                            });

                            return;
                        }

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

                    filter = filter.substring(4);
                }

                let data = await db.any(`
                                SELECT g.id, gt.home_away, t.school, c.name as conference, gt.points, cat.name as cat, typ.name as typ, a.id as athlete_id, a.name as athlete, gps.stat
                                FROM team t
                                    INNER JOIN game_team gt ON t.id = gt.team_id
                                    INNER JOIN game g ON gt.game_id = g.id
                                    LEFT JOIN conference_team ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year >= g.season OR ct.end_year IS NULL)
                                    LEFT JOIN conference c ON ct.conference_id = c.id
                                    INNER JOIN game_team gt2 ON g.id = gt2.game_id AND gt2.id <> gt.id
                                    INNER JOIN team t2 ON gt2.team_id = t2.id
                                    LEFT JOIN conference_team ct2 ON t2.id = ct2.team_id AND ct2.start_year <= g.season AND (ct2.end_year >= g.season OR ct2.end_year IS NULL)
                                    LEFT JOIN conference c2 ON ct2.conference_id = c2.id
                                    INNER JOIN game_player_stat gps ON gps.game_team_id = gt.id
                                    INNER JOIN player_stat_category cat ON gps.category_id = cat.id
                                    INNER JOIN player_stat_type typ ON gps.type_id = typ.id
                                    INNER JOIN athlete a ON gps.athlete_id = a.id
                                    WHERE ${filter}
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
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getRecords: async (req, res) => {
            try {
                if (!req.query.year && !req.query.team) {
                    res.status(400).send({
                        error: 'Must specify either a year or team query param'
                    });

                    return;
                }

                if (req.query.year && !parseInt(req.query.year)) {
                    res.status(400).send({
                        error: 'Year must be an integer'
                    });

                    return;
                }

                let filter = `WHERE g.status = 'completed'`;
                let params = [];
                let index = 1;

                if (req.query.year) {
                    filter += ` AND g.season = $${index}`;
                    params.push(req.query.year);
                    index++;
                }

                if (req.query.team) {
                    filter += ` AND LOWER(t.school) = LOWER($${index})`;
                    params.push(req.query.team);
                    index++;
                }

                if (req.query.conference) {
                    filter += ` AND LOWER(c.abbreviation) = LOWER($${index})`;
                    params.push(req.query.conference);
                    index++;
                }

                const results = await db.any(`
                SELECT 	g.season,
                        t.school AS team,
                        c.name AS conference,
                        ct.division,
                        COUNT(*) AS games,
                        COUNT(*) FILTER(WHERE gt.winner = true) AS wins,
                        COUNT(*) FILTER(WHERE gt2.winner = true) AS losses,
                        COUNT(*) FILTER(WHERE gt.winner <> true AND gt2.winner <> true) AS "ties",
                        COUNT(*) FILTER(WHERE g.conference_game = true) AS conference_games,
                        COUNT(*) FILTER(WHERE gt.winner = true AND g.conference_game = true) AS conference_wins,
                        COUNT(*) FILTER(WHERE gt2.winner = true AND g.conference_game = true) AS conference_losses,
                        COUNT(*) FILTER(WHERE gt.winner <> true AND gt2.winner <> true AND g.conference_game = true) AS conference_ties,
                        COUNT(*) FILTER(WHERE gt.home_away = 'home' AND g.neutral_site <> true) AS home_games,
                        COUNT(*) FILTER(WHERE gt.winner = true AND gt.home_away = 'home' AND g.neutral_site <> true) AS home_wins,
                        COUNT(*) FILTER(WHERE gt2.winner = true AND gt.home_away = 'home' AND g.neutral_site <> true) AS home_losses,
                        COUNT(*) FILTER(WHERE gt.winner <> true AND gt2.winner <> true AND gt.home_away = 'home' AND g.neutral_site <> true) AS home_ties,
                        COUNT(*) FILTER(WHERE gt.home_away = 'away' AND g.neutral_site <> true) AS away_games,
                        COUNT(*) FILTER(WHERE gt.winner = true AND gt.home_away = 'away' AND g.neutral_site <> true) AS away_wins,
                        COUNT(*) FILTER(WHERE gt2.winner = true AND gt.home_away = 'away' AND g.neutral_site <> true) AS away_losses,
                        COUNT(*) FILTER(WHERE gt.winner <> true AND gt2.winner <> true AND gt.home_away = 'away' AND g.neutral_site <> true) AS away_ties,
                        SUM(gt.win_prob) AS expected_wins
                FROM game AS g
                    INNER JOIN game_team AS gt ON g.id = gt.game_id
                    INNER JOIN game_team AS gt2 ON g.id = gt2.game_id AND gt2.id <> gt.id
                    INNER JOIN team AS t ON gt.team_id = t.id
                    INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= g.season AND (ct.end_year >= g.season OR ct.end_year IS NULL)
                    INNER JOIN conference AS c ON ct.conference_id = c.id AND c.division = 'fbs'
                ${filter}
                GROUP BY g.season, t.school, c.name, ct.division
                `, params);

                res.send(results.map(r => ({
                    year: r.season,
                    team: r.team,
                    conference: r.conference,
                    division: r.division || '',
                    expectedWins: Math.round(parseFloat(r.expected_wins * 10)) / 10,
                    total: {
                        games: parseInt(r.games),
                        wins: parseInt(r.wins),
                        losses: parseInt(r.losses),
                        ties: parseInt(r.ties)
                    },
                    conferenceGames: {
                        games: parseInt(r.conference_games),
                        wins: parseInt(r.conference_wins),
                        losses: parseInt(r.conference_losses),
                        ties: parseInt(r.conference_ties)
                    },
                    homeGames: {
                        games: parseInt(r.home_games),
                        wins: parseInt(r.home_wins),
                        losses: parseInt(r.home_losses),
                        ties: parseInt(r.home_ties)
                    },
                    awayGames: {
                        games: parseInt(r.away_games),
                        wins: parseInt(r.away_wins),
                        losses: parseInt(r.away_losses),
                        ties: parseInt(r.away_ties)
                    }
                })));
            } catch (err) {
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getMedia: async (req, res) => {
            try {
                if (!req.query.year) {
                    res.status(400).send({
                        error: 'Year is required'
                    });
                } else if (!parseInt(req.query.year)) {
                    res.status(400).send({
                        error: 'Year must be an integer'
                    });
                } else if (req.query.week && !parseInt(req.query.week)) {
                    res.status(400).send({
                        error: 'Week must be an integer'
                    });
                } else {
                    const results = await service.getMedia(req.query.year, req.query.seasonType, req.query.week, req.query.team, req.query.conference, req.query.mediaType, req.query.classification);
                    res.send(results);
                }
            } catch (err) {
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getCalendar: async (req, res) => {
            try {
                if (!req.query.year) {
                    res.status(400).send({
                        error: 'Year is required'
                    });
                } else if (!parseInt(req.query.year)) {
                    res.status(400).send({
                        error: 'Year must be an integer'
                    });
                } else {
                    const results = await service.getCalendar(req.query.year);
                    res.send(results);
                }
            } catch (err) {
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getWeather: async (req, res) => {
            try {
                if (!req.query.gameId && !req.query.year) {
                    res.status(400).send({
                        error: 'Year is required'
                    });
                } else if (req.query.year && !parseInt(req.query.year)) {
                    res.status(400).send({
                        error: 'Year must be an integer'
                    });
                } else {
                    const results = await service.getWeather(req.query.gameId, req.query.year, req.query.seasonType, req.query.week, req.query.team, req.query.conference, req.query.classification);
                    res.send(results);
                }
            } catch (err) {
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getScoreboard: async (req, res) => {
            try {
                const scoreboard = await service.getScoreboard(req.query.classification, req.query.conference);
                res.send(scoreboard);
            } catch (err) {
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getPlayerStatsByWeek: async (req, res) => {
            try {
                if (!req.query.week || !req.query.athleteId) {
                    res.status(400).send({
                        error: 'athletId and week must be specified'
                    });
                } else {
                    const data = await service.getPlayerStatsByWeek(req.query.week, req.query.athleteId);
                    res.send(data);
                }
            } catch (err) {
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        }
    }
}