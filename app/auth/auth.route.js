module.exports = (app, authDb, cors, Sentry) => {
    const controller = require('./auth.controller')(Sentry);

    app.route('/auth/key').post(cors, controller.generateKey);
};
