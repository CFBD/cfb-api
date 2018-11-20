module.exports = (app, db) => {
    const controller = require('./coach.controller')(db);

    app.route('/coaches').get(controller.getCoaches);
}