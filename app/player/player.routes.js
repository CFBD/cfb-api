const playerController = require('./player.controller');

module.exports = (app, db, cors) => {
    const controller = playerController(db);

    app.route('/player/search').get(cors, controller.playerSearch);
    app.route('/player/ppa/passing').get(cors, controller.getMeanPassingPPA);
    app.route('/player/usage').get(cors, controller.getPlayerUsage);
    app.route('/player/returning').get(cors, controller.getReturningProduction);
    app.route('/stats/player/season').get(cors, controller.getSeasonStats);
};