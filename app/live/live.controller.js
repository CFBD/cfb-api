const serviceConstructor = require('./live.service');

module.exports = async (db, Sentry) => {
    const service = await serviceConstructor(db);

    const getPlays = async (req, res) => {
        try {
            if (!req.query.id && !parseInt(req.query.id)) {
                res.status(400).send({
                    error: 'A numeric game id is required.'
                });
            } else {
                let results = await service.getPlays(req.query.id);
                res.send(results);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    return {
        getPlays
    };
};
