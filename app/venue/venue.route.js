module.exports = (app, db) => {
    const controller = require('./venue.controller')(db);

    app.route('/venues').get(controller.getVenues);
}