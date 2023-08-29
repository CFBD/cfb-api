const serviceConstructor = require('./play.service');

module.exports = (db, Sentry) => {
    const service = serviceConstructor(db);

    const getPlayTypes = async (req, res) => {
        try {
            let types = await service.getPlayTypes();
            res.send(types);
        } catch (err) { 
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getPlayStatTypes = async (req, res) => {
        try {
            let types = await service.getPlayStatTypes();
            res.send(types);
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getPlays = async (req, res) => {
        try {
            if (!req.query.year || isNaN(req.query.year)) {
                res.status(400).send({
                    error: 'A numeric year parameter must be specified.'
                });
            } else if (!req.query.week || isNaN(req.query.week)) {
                res.status(400).send({
                    error: 'A numeric week parameter must be specified.'
                });
            } else if (req.query.seasonType && req.query.seasonType != 'regular' && req.query.seasonType != 'postseason' && req.query.seasonType != 'both') {
                res.status(400).send({
                    error: 'Invalid season type'
                });
            } else {
                let plays = await service.getPlays(
                    req.query.year,
                    req.query.week,
                    req.query.team,
                    req.query.offense,
                    req.query.defense,
                    req.query.offenseConference,
                    req.query.defenseConference,
                    req.query.conference,
                    req.query.playType,
                    req.query.seasonType,
                    req.query.classification
                );

                res.send(plays);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getPlayStats = async (req, res) => {
        try {
            if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'Year parameter must be numeric'
                });
            } else if (req.query.week && !parseInt(req.query.week)) {
                res.status(400).send({
                    error: 'Week parameter must be numeric'
                });
            } else if (req.query.statTypeId && !parseInt(req.query.statTypeId)) {
                res.status(400).send({
                    error: 'statTypeId parameter must be numeric'
                });
            } else {
                let stats = await service.getPlayStats(
                    req.query.year,
                    req.query.week,
                    req.query.team,
                    req.query.gameId,
                    req.query.athleteId,
                    req.query.statTypeId,
                    req.query.seasonType,
                    req.query.conference
                );

                res.send(stats);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    }

    return {
        getPlays,
        getPlayTypes,
        getPlayStatTypes,
        getPlayStats
    }
}