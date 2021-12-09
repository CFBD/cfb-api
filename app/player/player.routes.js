const playerController = require('./player.controller');

module.exports = (app, db, middlewares, Sentry) => {
    const controller = playerController(db, Sentry);

    app.route('/player/search').get(middlewares, controller.playerSearch);
    app.route('/player/ppa/passing').get(middlewares, controller.getMeanPassingPPA);
    app.route('/player/usage').get(middlewares, controller.getPlayerUsage);
    app.route('/player/returning').get(middlewares, controller.getReturningProduction);
    app.route('/stats/player/season').get(middlewares, controller.getSeasonStats);
    app.route('/player/portal').get(middlewares, controller.getTransferPortal);
};