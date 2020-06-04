module.exports = (db) => {
    const service = require('./venue.service')(db);

    return {
        getVenues: async (req, res) => {
            try {
                const venues = await service.getVenues();
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