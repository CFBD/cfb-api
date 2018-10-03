module.exports = (db) => {
    return {
        /** 
         * @api {get} /plays Get play information
         * @apiVersion 1.0.0
         * @apiName GetPlays
         * @apiGroup Plays
         * 
         * @apiParam {String} seasonType 'regular', 'postseason', or 'both'. Defaults to 'regular'.
         * @apiParam {Number} year Required. Year filter for plays.
         * @apiParam {Number} week Week filter for plays.
         * @apiParam {String} team Name of team to filter on.
         * @apiParam {String} offense Name of offense team to filter on.
         * @apiParam {String} defense Name of defense team to filter on.
         * @apiParam {String} offenseConference Offense conference abbreviation
         * @apiParam {String} defenseConference Defense conference abbreviation
         * @apiParam {String} conference Conference abbreviation
         * @apiParam {Number} playType Play type id
         * 
         * @apiExample Whole week
         * curl -i https://api.collegefootballdata.com/plays?year=2018&week=3
         * 
         * @apiExample Single offensive team
         * curl -i https://api.collegefootballdata.com/plays?year=2018&offense=clemson
         * 
         * @apiSuccess {Object[]} plays List of plays.
         * @apiSuccess {String} plays.offense Offense team name
         * @apiSuccess {String} plays.offense_conference Offense conference
         * @apiSuccess {String} plays.defense Defense team name
         * @apiSuccess {String} plays.defense_conference Defense conference
         * @apiSuccess {Number} plays.offense_score Offensive team score
         * @apiSuccess {Number} plays.defense_score Defensive team score
         * @apiSuccess {Number} plays.id Id
         * @apiSuccess {Number} plays.drive_id Id of the drive
         * @apiSuccess {Number} plays.period Period
         * @apiSuccess {Object} plays.clock Playclock information
         * @apiSuccess {Number} plays.clock.minutes Minutes on the playclock
         * @apiSuccess {Number} plays.clock.seconds Seconds on the playclock
         * @apiSuccess {Number} plays.yard_line Where the play started
         * @apiSuccess {Number} plays.down Down
         * @apiSuccess {Number} plays.distance Distance
         * @apiSuccess {Number} plays.yards_gained Yards gained
         * @apiSuccess {String} plays.play_type Type of play
         * @apiSuccess {String} plays.play_text Description of the play
         * 
         */
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

                    if (params.length < 3) {
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
                        INNER JOIN conference_team oct ON offense.id = oct.team_id
                        INNER JOIN conference oc ON oct.conference_id = oc.id
                        INNER JOIN team defense ON p.defense_id = defense.id
                        INNER JOIN conference_team dct ON defense.id = dct.team_id
                        INNER JOIN conference dc ON dct.conference_id = dc.id
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
            /** 
             * @api {get} /play/types Get play types
             * @apiVersion 1.0.0
             * @apiName GetPlayTypes
             * @apiGroup Plays
             * 
             * @apiExample Example
             * curl -i https://api.collegefootballdata.com/play/types
             * 
             * @apiSuccess {Object[]} playTypes List of play types
             * @apiSuccess {Number} playTypes.id Id
             * @apiSuccess {String} playTypes.text Text
             * @apiSuccess {String} playTypes.abbreviation abbreviation
             * 
             */
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