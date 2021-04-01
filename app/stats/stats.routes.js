const controllerConstructor = require('./stats.controller');

module.exports = (app, db, middlewares, Sentry) => {
    const controller = controllerConstructor(db, Sentry);

    app.route('/stats/season').get(middlewares, controller.getTeamStats);
    app.route('/stats/season/advanced').get(middlewares, controller.getAdvancedStats);
    app.route('/stats/categories').get(middlewares, controller.getCategories);
    app.route('/stats/game/advanced').get(middlewares, controller.getAdvancedGameStats);
    app.route('/game/box/advanced').get(middlewares, controller.getAdvancedBoxScore);
}