module.exports = (db) => {
    return {
        getVenues: async (req, res) => {
            try {
                let venues = await db.any(`
                    SELECT id, name, capacity, grass, city, state, zip, country_code, location, elevation, year_constructed, dome
                    FROM venue
                    ORDER BY name
                `);

                res.send(venues);
            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        }
    }
}