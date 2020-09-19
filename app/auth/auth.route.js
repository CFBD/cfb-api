module.exports = (app, authDb, cors, Sentry) => {
    const controller = require('./auth.controller')(authDb, Sentry);

    app.route('/auth').post(cors, controller.generateKey);
}