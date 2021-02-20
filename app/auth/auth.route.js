module.exports = (app, authDb, cors, Sentry) => {
    const controller = require('./auth.controller')(Sentry);

    app.route('/auth/key').post(cors, controller.generateKey);
    app.route('/test').get((req, res) => {
        res.send({
            origin: req.get('origin'),
            host: req.get('host')
        });
    });
};
