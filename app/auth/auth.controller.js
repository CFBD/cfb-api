const serviceConstructor = require('./auth.service');

module.exports = (authDb, Sentry) => {
    const service = serviceConstructor(authDb);

    const generateKey = async (req, res) => {
        try {
            if (req.body && req.body.email) {
                const token = await service.generateKey(req.body.email);
                res.sendStatus(200);
            } else {
                res.status(400).send({
                    error: 'email must be specified'
                });
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    return {
        generateKey
    };
};
