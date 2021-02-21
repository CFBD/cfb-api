module.exports = (app, cors, Sentry, brute) => {
    const controller = require('./auth.controller')(Sentry);

    app.route('/auth/key').post(cors, brute.prevent, controller.generateKey);
};
