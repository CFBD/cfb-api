const serviceConstructor = require('./auth.service');

module.exports = (Sentry) => {
    const service = serviceConstructor();
    const emailPattern = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

    const generateKey = async (req, res) => {
        try {
            if (!req.body && !req.body.email) {
                res.status(400).send({
                    error: 'An email address is required'
                });
            } else if (!emailPattern.test(req.body.email)) {
                res.status(400).send({
                    error: 'A valid email address is required'
                });
            } else {
                await service.generateKey(req.body.email);
                res.sendStatus(200);
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send('Something went wrong');
        }
    };

    return {
        generateKey
    };
};