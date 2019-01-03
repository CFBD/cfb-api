module.exports = (app, db, cors) => {
    const controller = require('./venue.controller')(db);

    app.route('/venues').get(cors, controller.getVenues);
}