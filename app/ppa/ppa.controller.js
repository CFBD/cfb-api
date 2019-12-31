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
                let results = await service.getWP(req.query.gameId, req.query.adjustForSpread);
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
                const results = await service.getPPAByTeam(req.query.year, req.query.team, req.query.conference, req.query.excludeGarbageTime);
                res.send(results);
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    }

    const getPPAByGame = async (req, res) => {
        try {
            if (!req.query.year) {
                res.status(400).send({
                    error: 'year must be specified'
                });
            } else if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be numeric'
                });
            } else if (req.query.week && !parseInt(req.query.week)) {
                res.status(400).send({
                    error: 'week must be numeric'
                });
            } else {
                const results = await service.getPPAByGame(req.query.year, req.query.team, req.query.conference, req.query.week, req.query.excludeGarbageTime);
                res.send(results);
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getPPAByPlayerGame = async (req, res) => {
        try {
            if (!req.query.week && !req.query.team) {
                res.status(400).send({
                    error: 'A week or team must be specified'
                });
            } else if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be numeric'
                });
            } else if (req.query.week && !parseInt(req.query.week)) {
                res.status(400).send({
                    error: 'week must be numeric'
                });
            } else if (req.query.threshold && !parseInt(req.query.threshold)) {
                res.status(400).send({
                    error: 'threshold must by numeric'
                });
            } else if (req.query.playerId && !parseInt(req.query.playerId)) {
                res.status(400).send({
                    error: 'playerId must be numeric'
                });
            } else {
                const results = await service.getPPAByPlayerGame(req.query.year, req.query.week, req.query.position, req.query.team, req.query.playerId, req.query.threshold, req.query.excludeGarbageTime);
                res.send(results);
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getPPAByPlayerSeason = async (req, res) => {
        try {
            if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be numeric'
                });
            } else if (req.query.week && !parseInt(req.query.week)) {
                res.status(400).send({
                    error: 'week must be numeric'
                });
            } else if (req.query.threshold && !parseInt(req.query.threshold)) {
                res.status(400).send({
                    error: 'threshold must by numeric'
                });
            } else if (req.query.playerId && !parseInt(req.query.playerId)) {
                res.status(400).send({
                    error: 'playerId must be numeric'
                });
            } else {
                const results = await service.getPPAByPlayerSeason(req.query.year, req.query.conference, req.query.position, req.query.team, req.query.playerId, req.query.threshold, req.query.excludeGarbageTime);
                res.send(results);
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getPregameWP = async (req, res) => {
        try {
            if (req.query.year && !parseInt(req.query.year)) {
                res.status(400).send({
                    error: 'year must be numeric'
                });
            } else if (req.query.week && !parseInt(req.query.week)) {
                res.status(400).send({
                    error: 'week must be numeric'
                });
            } else {
                const results = await service.getPregameWP(req.query.year, req.query.week, req.query.team, req.query.seasonType);
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
        getWP,
        getPPAByGame,
        getPPAByPlayerGame,
        getPPAByPlayerSeason,
        getPregameWP
    }
}