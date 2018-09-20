module.exports = (db) => {
    return {
        
        /** 
         * @api {get} /teams Get team information
         * @apiVersion 1.0.0
         * @apiName GetTeams
         * @apiGroup Teams
         * 
         * @apiSuccess {Object[]} teams List of teams.
         * @apiSuccess {String} teams.school Name of school
         * @apiSuccess {String} teams.mascont Name of mascot
         * @apiSuccess {String} teams.abbreviation Team abbreviation
         * @apiSuccess {String} teams.color Primary color hex code
         * @apiSuccess {String} teams.alt_color Secondary color hex code
         * 
         */
        getTeams: async (req, res) => {
            try {
                let teams = await db.any(`
                    SELECT school, mascot, abbreviation, ('#' || color) as color, ('#' || alt_color) as alt_color
                    FROM team
                    ORDER BY active DESC, school
                `);

                res.send(teams);
            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        }
    }
}