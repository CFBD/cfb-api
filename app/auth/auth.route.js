module.exports = (app, authDb, cors, Sentry, brute) => {
    const controller = require('./auth.controller')(Sentry);

    app.route('/auth/key').post(cors, brute.prevent, controller.generateKey);
    app.route('/test').get(cors, (req, res) => {
        res.send({
            origin: req.get('origin'),
            host: req.get('host')
        });
    });
};
