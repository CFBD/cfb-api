module.exports = (db) => {
    return {
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