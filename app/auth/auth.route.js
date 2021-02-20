module.exports = (app, cors, Sentry) => {
    const controller = require('./auth.controller')(Sentry);

    app.route('/auth/key').post(cors, controller.generateKey);
};
