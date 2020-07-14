module.exports = (app, db, cors, Sentry) => {
    const controller = require('./rankings.controller')(db, Sentry);

    app.route('/rankings').get(cors, controller.getRankings);
}