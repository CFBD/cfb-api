module.exports = (db, Sentry) => {
    const service = require('./venue.service')(db);

    return {
        getVenues: async (req, res) => {
            try {
                const venues = await service.getVenues();
                res.send(venues);
            } catch (err) {
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        }
    }
}