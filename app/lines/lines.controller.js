const serviceConstructor = require('./lines.service');

module.exports = (db, Sentry) => {
    const service = serviceConstructor(db);

    const getLines = async (req, res) => {
        try {
            if (!req.query.year) {
                res.status(400).send({
                    error: 'year parameter is required.'
                });

                return;
            } else if (isNaN(req.query.year)) {
                res.status(400).send({
                    error: 'A numeric year parameter must be specified.'
                });

                return;
            } else if (req.query.week && isNaN(req.query.week)) {
                res.status(400).send({
                    error: 'Week parameter must be numeric'
                });

                return;
            } else {
                const lines = await service.getLines(req.query.year, req.query.seasonType, req.query.week, req.query.team, req.query.home, req.query.away, req.query.conference);
                res.send(lines);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    return {
        getLines
    };
};