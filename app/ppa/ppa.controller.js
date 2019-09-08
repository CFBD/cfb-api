const serviceConstructor = require('./ppa.service');

module.exports = (db) => {
    const service = serviceConstructor(db);

    const getPP = async (req, res) => {
        try {
            if (!req.query.down || !req.query.distance) {
                res.status(400).send({
                    error: 'Down and distance must be specified.'
                });
            } else if (!parseInt(req.query.down)) {
                res.status(400).send({
                    error: 'Down must be numeric.'
                });
            } else if (!parseInt(req.query.distance)) {
                res.status(400).send({
                    error: 'Distance must be numeric'
                });
            } else {
                let results = await service.getPP(req.query.down, req.query.distance);
                res.send(results);
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getWP = async (req, res) => {
        try {
            if (!req.query.gameId) {
                res.status(400).send({
                    error: 'gameId is required.'
                });
            } else {
                let results = await service.getWP(req.query.gameId);
                res.send(results);
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    }
    
    const getPPAByTeam = async (req, res) => {
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
                const results = await service.getPPAByTeam(req.query.year, req.query.team, req.query.conference);
                res.send(results);
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    }

    return {
        getPP,
        getPPAByTeam,
        getWP
    }
}