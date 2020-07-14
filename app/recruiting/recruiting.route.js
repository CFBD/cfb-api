const recruitingController = require('./recruiting.controller');

module.exports = (app, db, cors, Sentry) => {
    const controller = recruitingController(db, Sentry);

    app.route('/recruiting/players').get(cors, controller.getPlayers);
    app.route('/recruiting/groups').get(cors, controller.getAggregatedPlayers);
    app.route('/recruiting/teams').get(cors, controller.getTeams);
};
