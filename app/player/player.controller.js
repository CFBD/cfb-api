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

    return {
        playerSearch
    };
};
