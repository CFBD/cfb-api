module.exports = (db) => {
    return {
        /** 
         * @api {get} /games Get game information
         * @apiVersion 1.0.0
         * @apiName GetGames
         * @apiGroup Games
         * 
         * @apiParam {String} seasonType 'regular' or 'postseason'. Defaults to 'regular'.
         * @apiParam {Number} year Required. Year filter for games.
         * @apiParam {Number} week Week filter for games.
         * @apiParam {String} team Name of a team to filter on.
         * @apiParam {String} home Name of home team to filter on.
         * @apiParam {String} away Name of away team to filter on.
         * @apiParam {String} conference Conference abbreviation
         * 
         * @apiExample Whole season
         * curl -i https://api.collegefootballdata.com/games?year=2018
         * 
         * @apiExample Single team
         * curl -i https://api.collegefootballdata.com/games?year=2018&team=michigan
         * 
         * @apiExample Single conference and week
         * curl -i https://api.collegefootballdata.com/games?year=2018&week=4&conference=SEC
         * 
         * @apiSuccess {Object[]} games List of games.
         * @apiSuccess {Number} games.id Id
         * @apiSuccess {Number} games.season Season
         * @apiSuccess {Number} games.week Week
         * @apiSuccess {String} games.season_type Season type (e.g. regular, postseason, or both)
         * @apiSuccess {Date} games.start_date Start date
         * @apiSuccess {Boolean} games.neutral_site Neutral site flag
         * @apiSuccess {Boolean} games.conference_game Conference game flag
         * @apiSuccess {Number} games.attendance Attendance
         * @apiSuccess {Number} games.venue_id Venue id
         * @apiSuccess {String} games.venue Venue for game
         * @apiSuccess {String} games.home_team Home team name
         * @apiSuccess {String} games.home_conference Home team conference
         * @apiSuccess {Number} games.home_points Home team points
         * @apiSuccess {Number[]} games.home_line_scores Home points breakdown by quarter
         * @apiSuccess {String} games.away_team Home team name
         * @apiSuccess {String} games.away_conference Away team conference
         * @apiSuccess {Number} games.away_points Away team points
         * @apiSuccess {Number[]} games.away_line_scores Away points breakdown by quarter
         * 
         */
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
                        LEFT JOIN conference_team hct ON home.id = hct.team_id
                        LEFT JOIN conference hc ON hct.conference_id = hc.id
                        INNER JOIN game_team gt2 ON g.id = gt2.game_id AND gt2.home_away = 'away'
                        INNER JOIN team away ON gt2.team_id = away.id
                        LEFT JOIN conference_team act ON away.id = act.team_id
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
            /** 
             * @api {get} /drives Get drive information
             * @apiVersion 1.0.0
             * @apiName GetDrives
             * @apiGroup Games
             * 
             * @apiParam {String} seasonType 'regular', 'postseason' or 'both'. Defaults to 'regular'.
             * @apiParam {Number} year Required. Year filter for drives.
             * @apiParam {Number} week Week filter for drives.
             * @apiParam {String} team Name of team to filter on.
             * @apiParam {String} offense Name of offense team to filter on.
             * @apiParam {String} defense Name of defense team to filter on.
             * @apiParam {String} offenseConference Offense conference abbreviation
             * @apiParam {String} defenseConference Defense conference abbreviation
             * @apiParam {String} conference Conference abbreviation
             * 
             * @apiExample Whole season
             * curl -i https://api.collegefootballdata.com/drives?year=2018
             * 
             * @apiExample Single defensive team
             * curl -i https://api.collegefootballdata.com/drives?year=2018&defense=virginia%20tech
             * 
             * @apiSuccess {Object[]} drives List of drives.
             * @apiSuccess {String} drives.offense Offense team name
             * @apiSuccess {String} drives.offense_conference Offense conference
             * @apiSuccess {String} drives.defense Defense team name
             * @apiSuccess {String} drives.defense_conference Defense conference
             * @apiSuccess {Number} drives.id Id
             * @apiSuccess {Number} drives.game_id Game id
             * @apiSuccess {Boolean} drives.scoring Scoring flag
             * @apiSuccess {Number} drives.start_period Quarter the drive started in
             * @apiSuccess {Number} drives.start_yardline Yard line at which the drive began
             * @apiSuccess {Object} drives.start_time Time that the drive started on the playclock
             * @apiSuccess {Number} drives.start_time.minutes Minutes on the playclock
             * @apiSuccess {Number} drives.start_time.seconds Seconds on the playclock
             * @apiSuccess {Number} drives.end_period Quarter the drive ended in
             * @apiSuccess {Number} drives.end_yardline Yard line at which the drive began
             * @apiSuccess {Object} drives.end_time Time that the drive ended on the playclock
             * @apiSuccess {Number} drives.end_time.minutes Minutes on the playclock
             * @apiSuccess {Number} drives.end_time.seconds Seconds on the playclock
             * @apiSuccess {Number} drives.plays Number of plays in the drive
             * @apiSuccess {Number} drives.yards Length of the drive
             * @apiSuccess {String} drives.drive_result Result of the drive
             * 
             */
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
                                LEFT JOIN conference_team oct ON offense.id = oct.team_id
                                LEFT JOIN conference oc ON oct.conference_id = oc.id
                                INNER JOIN team defense ON d.defense_id = defense.id
                                LEFT JOIN conference_team dct ON defense.id = dct.team_id
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
                    /** 
                     * @api {get} /games/teams Get team statistics broken down by game
                     * @apiVersion 1.0.0
                     * @apiName GetTeamStats
                     * @apiGroup Games
                     * 
                     * @apiParam {String} seasonType 'regular' or 'postseason'. Defaults to 'regular'.
                     * @apiParam {Number} year Year filter
                     * @apiParam {Number} week Week filter
                     * @apiParam {String} team Team filter
                     * @apiParam {String} conference Conference filter
                     * 
                     * @apiExample Whole week
                     * curl -i https://api.collegefootballdata.com/games/teams?year=2018&week=3
                     * 
                     * @apiExample Single team
                     * curl -i https://api.collegefootballdata.com/games/teams?year=2018&team=clemson
                     * 
                     * @apiExample Single game
                     * curl -i https://api.collegefootballdata.com/games/teams?gameId=401012891
                     * 
                     * @apiSuccess {Object[]} games List of games.
                     * @apiSuccess {Number} games.id Game id
                     * @apiSuccess {String} games.teams Teams associated with a game
                     * @apiSuccess {Object} games.teams.school School
                     * @apiSuccess {String} games.teams.school.name Name of school
                     * @apiSuccess {String} games.teams.school.conference Conference
                     * @apiSuccess {String} games.teams.homeAway Home/away flag
                     * @apiSuccess {Number} games.teams.points Points
                     * @apiSuccess {String} games.teams.stats Collection of stats
                     * @apiSuccess {String} games.teams.stats.category Statistical category
                     * @apiSuccess {String} games.teams.stats.stat Stat
                     * 
                     */
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
                                    LEFT JOIN conference_team ct ON t.id = ct.team_id
                                    LEFT JOIN conference c ON ct.conference_id = c.id
                                    INNER JOIN game_team gt2 ON g.id = gt2.game_id AND gt2.id <> gt.id
                                    INNER JOIN team t2 ON gt2.team_id = t2.id
                                    LEFT JOIN conference_team ct2 ON t2.id = ct2.team_id
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
                    }
    }
}