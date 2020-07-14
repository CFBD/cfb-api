module.exports = (app, db, cors, Sentry) => {
    const controller = require('./coach.controller')(db, Sentry);

    app.route('/coaches').get(cors, controller.getCoaches);
}