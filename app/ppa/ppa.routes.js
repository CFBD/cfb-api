const controllerConstructor = require('./ppa.controller');

module.exports = (app, db, middlewares, Sentry) => {
    const controller = controllerConstructor(db, Sentry);

    app.route('/ppa/predicted').get(middlewares, controller.getPP);
    app.route('/ppa/teams').get(middlewares, controller.getPPAByTeam);
    app.route('/ppa/games').get(middlewares, controller.getPPAByGame);
    app.route('/ppa/players/games').get(middlewares, controller.getPPAByPlayerGame);
    app.route('/ppa/players/season').get(middlewares, controller.getPPAByPlayerSeason);
    app.route('/metrics/wp').get(middlewares, controller.getWP);
    app.route('/metrics/wp/pregame').get(middlewares, controller.getPregameWP);
    app.route('/metrics/fg/ep').get(middlewares, controller.getFGEP);
}