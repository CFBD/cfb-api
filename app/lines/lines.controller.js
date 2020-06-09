const serviceConstructor = require('./lines.service');

module.exports = (db) => {
    const service = serviceConstructor(db);

    const getLines = async (req, res) => {
        try {
            if (req.query.gameId && isNaN(req.query.gameId)) {
                res.status(400).send({
                    error: 'gameId parameter must be numeric.'
                });

                return;
            } else if (!req.query.year || isNaN(req.query.year)) {
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
                const lines = await service.getLines(req.query.gameId, req.query.year, req.query.seasonType, req.query.week, req.query.team, req.query.home, req.query.away, req.query.conference);
                res.send(lines);
            }
        } catch (err) {
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    return {
        getLines
    };
};