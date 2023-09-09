const serviceConstructor = require('./ratings.service');

module.exports = (db, Sentry) => {
    const service = serviceConstructor(db);

    const getSP = async (req, res) => {
        try {
            if (!req.query.year && !req.query.team) {
                res.status(400).send('A year or team must be specified.');
            } else if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send('Year must be an integer.');
            } else {
                let ratings = await service.getSP(req.query.year, req.query.team);
                res.send(ratings);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getConferenceSP = async (req, res) => {
        try {
            if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send('Year must be an integer');
            } else {
                let ratings = await service.getConferenceSP(req.query.year, req.query.conference);
                res.send(ratings);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getSRS = async (req, res) => {
        try {
            if (!req.query.year && !req.query.team) {
                res.status(400).send('A year or team must be specified.');
            } else if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send('Year must be an integer.');
            } else {
                let ratings = await service.getSRS(req.query.year, req.query.team, req.query.conference);
                res.send(ratings);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getElo = async (req, res) => {
        try {
            if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send('Year must be an integer.');
            } else if (req.query.week && !parseInt(req.query.week)) {
                res.status(400).send('Week must be an integer.');
            } else {
                let elos = await service.getElo(req.query.year, req.query.week, req.query.seasonType, req.query.team, req.query.conference);
                res.send(elos);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getFpi = async (req, res) => {
        try {
            if (!req.query.year && !req.query.team) {
                res.status(400).send("Year or team must be specified");
            } else if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send('Year must be an integer.');
            } else {
                let elos = await service.getFpi(req.query.year, req.query.team, req.query.conference);
                res.send(elos);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    }

    return {
        getSP,
        getConferenceSP,
        getSRS,
        getElo,
        getFpi
    };
};
