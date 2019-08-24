const serviceConstructor = require('./ratings.service');

module.exports = (db) => {
    const service = serviceConstructor(db);

    const getSP = async (req, res) => {
        if (!req.query.year && !req.query.team) {
            res.status(400).send('A year or team must be specified.');
        } else if (req.query.year && !parseInt(req.query.year)) {
            res.status(400).send('Year must be an integer.');
        } else {
            let ratings = await service.getSP(req.query.year, req.query.team);
            res.send(ratings);
        }
    };

    const getConferenceSP = async (req, res) => {
        if (req.query.year && !parseInt(req.query.year)) {
            res.status(400).send('Year must be an integer');
        } else {
            let ratings = await service.getConferenceSP(req.query.year, req.query.conference);
            res.send(ratings);
        }
    }
    
    return {
        getSP,
        getConferenceSP
    };
};
