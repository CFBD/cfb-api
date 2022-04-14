const playerService = require('./player.service');

module.exports = (db, Sentry) => {
    const service = playerService(db);

    const playerSearch = async (req, res) => {
        try {
            if (!req.query.searchTerm) {
                res.status(400).send({
                    error: 'searchTerm must be specified'
                });
            } else if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be an integer'
                });
            }else {
                let results = await service.playerSearch(req.query.year, req.query.team, req.query.position, req.query.searchTerm);
                res.send(results);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getMeanPassingPPA = async (req, res) => {
        try {
            if (!req.query.id || !parseInt(req.query.id)) {
                res.status(400).send({
                    error: 'a numeric id param is required'
                });
            } else if (req.query.rollingPlays && !parseInt(req.query.rollingPlays)) {
                res.status(400).send({
                    error: 'rollingPlays must be numeric'
                });
            } else if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be numeric'
                });
            } else {
                let results = await service.getMeanPassingChartData(req.query.id, req.query.rollingPlays, req.query.year);
                res.send(results);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getPlayerUsage = async (req, res) => {
        try {
            if (!req.query.year) {
                res.status(400).send({
                    error: 'year must be specified'
                });
            } else if (!parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be numeric'
                });
            } else if (req.query.playerId && !parseInt(req.query.playerId)) {
                res.status(400).send({
                    error: 'playerId must be numeric'
                });
            } else {
                const results = await service.getPlayerUsage(req.query.year, req.query.conference, req.query.position, req.query.team, req.query.playerId, req.query.excludeGarbageTime);
                res.send(results);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getReturningProduction = async (req, res) => {
        try {
            if (!req.query.year && !req.query.team) {
                res.status(400).send({
                    error: 'year or team must be specified'
                });
            } else if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be numeric'
                });
            } else {
                const results = await service.getReturningProduction(req.query.year, req.query.team, req.query.conference);
                res.send(results);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getSeasonStats = async (req, res) => {
        try {
            if (!req.query.year) {
                res.status(400).send({
                    error: 'year must be specified'
                });
            } else if (!parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be an integer'
                });
            } else if (req.query.startWeek && !parseInt(req.query.startWeek)) {
                res.status(400).send({
                    error: 'startWeek must be an integer'
                });
            } else if (req.query.endWeek && !parseInt(req.query.endWeek)) {
                res.status(400).send({
                    error: 'endWeek must be an integer'
                });
            } else {
                const data = await service.getSeasonStats(req.query.year, req.query.conference, req.query.team, req.query.startWeek, req.query.endWeek, req.query.seasonType, req.query.category);

                res.send(data);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getTransferPortal = async (req, res) => {
        try {
            if (!req.query.year) {
                res.status(400).send({
                    error: 'year must be specified'
                });
            } else if (!parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be an integer'
                });
            } else {
                const data = await service.getTransferPortal(req.query.year);
                res.send(data);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    return {
        playerSearch,
        getMeanPassingPPA,
        getPlayerUsage,
        getReturningProduction,
        getSeasonStats,
        getTransferPortal
    };
};
