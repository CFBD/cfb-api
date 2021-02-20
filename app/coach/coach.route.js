module.exports = (app, db, middlewares, Sentry) => {
    const controller = require('./coach.controller')(db, Sentry);

    app.route('/coaches').get(middlewares, controller.getCoaches);
}