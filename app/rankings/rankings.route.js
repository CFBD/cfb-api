module.exports = (app, db, middlewares, Sentry) => {
    const controller = require('./rankings.controller')(db, Sentry);

    app.route('/rankings').get(middlewares, controller.getRankings);
}