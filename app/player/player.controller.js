const playerService = require('./player.service');

module.exports = (db) => {
    const service = playerService(db);

    const playerSearch = async (req, res) => {
        try {
            if (!req.query.searchTerm) {
                res.status(400).send({
                    error: 'searchTerm must be specified'
                });
            } else {
                let results = await service.playerSearch(req.query.active, req.query.team, req.query.position, req.query.searchTerm);
                res.send(results);
            }
        } catch (err) {
            console.error(err);
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
            } else {
                let results = await service.getMeanPassingChartData(req.query.id);
                res.send(results);
            }
        } catch (err) {
            console.error(err);
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
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    return {
        playerSearch,
        getMeanPassingPPA,
        getPlayerUsage
    };
};
