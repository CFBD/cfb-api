module.exports = (app, db, cors) => {
    const controller = require('./coach.controller')(db);

    app.route('/coaches').get(cors, controller.getCoaches);
}