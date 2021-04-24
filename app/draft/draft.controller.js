const serviceConstructor = require('./draft.service');

module.exports = (db, Sentry) => {
    const service = serviceConstructor(db);

    const getTeams = async (req, res) => {
        try {
            const teams = await service.getTeams();
            res.send(teams);
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getPositions = async (req, res) => {
        try {
            let positions = await service.getPositions();
            res.send(positions);
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getPicks = async (req, res) => {
        try {
            if (req.query.year && isNaN(req.query.year)) {
                res.status(400).send({
                    error: 'Year param must be numeric'
                });
            } else {
                let picks = await service.getPicks(req.query.year, req.query.nflTeam, req.query.college, req.query.conference, req.query.position);
                res.send(picks);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    return {
        getTeams,
        getPositions,
        getPicks
    };
};
