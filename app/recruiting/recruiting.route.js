const recruitingController = require('./recruiting.controller');

module.exports = (app, db, middlewares, Sentry) => {
    const controller = recruitingController(db, Sentry);

    app.route('/recruiting/players').get(middlewares, controller.getPlayers);
    app.route('/recruiting/groups').get(middlewares, controller.getAggregatedPlayers);
    app.route('/recruiting/teams').get(middlewares, controller.getTeams);
};
