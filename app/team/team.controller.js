module.exports = (db) => {
    return {
        
        /** 
         * @api {get} /teams Get team information
         * @apiVersion 1.0.0
         * @apiName GetTeams
         * @apiGroup Teams
         * 
         * @apiParam {String} conference Conference abbreviation (optional)
         * 
         * @apiExample All teams
         * curl -i https://api.collegefootballdata.com/teams
         * 
         * @apiExample Big Ten teams
         * curl -i https://api.collegefootballdata.com/teams?conference=B1G
         * 
         * 
         * @apiSuccess {Object[]} teams List of teams.
         * @apiSuccess {String} teams.school Name of school
         * @apiSuccess {String} teams.mascot Name of mascot
         * @apiSuccess {String} teams.abbreviation Team abbreviation
         * @apiSuccess {String} teams.conference Name of conference
         * @apiSuccess {String} teams.division Name of conference division
         * @apiSuccess {String} teams.color Primary color hex code
         * @apiSuccess {String} teams.alt_color Secondary color hex code
         * @apiSuccess {String[]} teams.logos Team logos
         * 
         */
        getTeams: async (req, res) => {
            try {
                let filter = req.query.conference ? 'WHERE LOWER(c.abbreviation) = LOWER($1)' : '';
                let params = [req.query.conference];

                let teams = await db.any(`
                    SELECT t.school, t.mascot, t.abbreviation, c.name as conference, ct.division as division, ('#' || t.color) as color, ('#' || t.alt_color) as alt_color, t.images as logos
                    FROM conference c
                        INNER JOIN conference_team ct ON c.id = ct.conference_id
                        INNER JOIN team t ON ct.team_id = t.id
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
        /** 
         * @api {get} /roster Get team roster
         * @apiVersion 1.0.0
         * @apiName GetRoster
         * @apiGroup Teams
         * 
         * @apiParam {String} team Name of team to filter on.
         * 
         * @apiExample Example
         * curl -i https://api.collegefootballdata.com/roster?team=Clemson
         * 
         * @apiSuccess {Object[]} roster List of players
         * @apiSuccess {Number} roster.id Id of player
         * @apiSuccess {String} roster.first_name Player first name
         * @apiSuccess {String} roster.last_name Player last name
         * @apiSuccess {Number} roster.height Player height, in inches
         * @apiSuccess {Number} roster.weight Player weight, in pounds
         * @apiSuccess {Number} roster.jersey Player jersey number
         * @apiSuccess {Number} roster.year Player eligibility year
         * @apiSuccess {String} roster.position Player position
         * @apiSuccess {String} roster.city Player home city
         * @apiSuccess {String} roster.state Player home state or province
         * @apiSuccess {String} roster.country Player home country
         * 
         */
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
        /** 
         * @api {get} /conferences Get conferences
         * @apiVersion 1.0.0
         * @apiName GetConferences
         * @apiGroup Teams
         * 
         * @apiExample Example
         * curl -i https://api.collegefootballdata.com/conferences
         * 
         * @apiSuccess {Object[]} conferences List of conferences
         * @apiSuccess {Number} id Conference id
         * @apiSuccess {String} name Name
         * @apiSuccess {String} short_name Short name
         * @apiSuccess {String} abbreviation Abbreviation
         * 
         */
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
        }
    }
}