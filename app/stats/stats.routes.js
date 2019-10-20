const controllerConstructor = require('./stats.controller');

module.exports = (app, db, cors) => {
    const controller = controllerConstructor(db);

    app.route('/stats/season').get(cors, controller.getTeamStats);
    app.route('/stats/season/advanced').get(cors, controller.getAdvancedStats);
    app.route('/stats/categories').get(cors, controller.getCategories);
    app.route('/stats/game/advanced').get(cors, controller.getAdvancedGameStats);
    app.route('/game/box/advanced').get(cors, controller.getAdvancedBoxScore);
}