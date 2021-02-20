module.exports = (app, db, middlewares, Sentry) => {
    const controller = require('./venue.controller')(db, Sentry);

    app.route('/venues').get(middlewares, controller.getVenues);
}