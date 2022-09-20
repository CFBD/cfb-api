const serviceConstructor = require('./auth.service');

module.exports = (Sentry, db) => {
    const service = serviceConstructor(db);
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

    const graphQLAuth = async (req, res) => {
        try {
            res.status(200).send({
                "X-Hasura-User-Id": req.user.id,
                "X-Hasura-Role": "user",
                "X-Hasura-Is-Owner": "false",
                "Cache-Control": "max-age=86400"
            });
        } catch (err) {
            res.sendStatus(401);
        }
    };

    return {
        generateKey,
        graphQLAuth
    };
};