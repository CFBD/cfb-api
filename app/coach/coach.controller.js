const serviceConstructor = require('./coach.service');

module.exports = (db, Sentry) => {
    const service = serviceConstructor(db);

    return {
        getCoaches: async (req, res) => {
            try {
                if (req.query.year && isNaN(req.query.year)) {
                    res.status(400).send({
                        error: 'Year param must be numeric'
                    });
    
                    return;
                } else if (req.query.minYear && isNaN(req.query.minYear)) {
                    res.status(400).send({
                        error: 'minYear param must be numeric.'
                    });
    
                    return;
                } else if (req.query.maxYear && isNaN(req.query.maxYear)) {
                    res.status(400).send({
                        error: 'maxYear param must be numeric.'
                    });
    
                    return;
                } else {
                    const coaches = await service.getCoaches(req.query.firstName, req.query.lastName, req.query.team, req.query.year, req.query.minYear, req.query.maxYear);
                    res.send(coaches);
                }  
            } catch (err) {
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        }
    }
}