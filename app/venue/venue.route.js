module.exports = (app, db, cors, Sentry) => {
    const controller = require('./venue.controller')(db, Sentry);

    app.route('/venues').get(cors, controller.getVenues);
}