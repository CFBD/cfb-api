const serviceContructor = require('./stats.service');

module.exports = (db) => {
    const service = serviceContructor(db);

    const getTeamStats = async (req, res) => {
        try {
            if (!req.query.year && !req.query.team) {
                res.status(400).send({
                    error: 'year or team are required'
                });
            } else if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be numeric'
                });
            } else {
                const stats = await service.getTeamStats(req.query.year, req.query.team, req.query.conference);
                res.send(stats);
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    }

    const getCategories = async (req, res) => {
        const categories = await service.getCategories();
        res.send(categories);
    }

    const getAdvancedStats = async (req, res) => {
        try {
            if (!req.query.year && !req.query.team) {
                res.status(400).send({
                    error: 'team or year must be specified'
                });
            } else if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be numeric'
                });
            } else {
                const results = await service.getAdvancedStats(req.query.year, req.query.team);
                res.send(results);
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: 'something went wrong'
            });
        }
    }

    return {
        getTeamStats,
        getCategories,
        getAdvancedStats
    }
}