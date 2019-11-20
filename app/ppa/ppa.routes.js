const controllerConstructor = require('./ppa.controller');

module.exports = (app, db, cors) => {
    const controller = controllerConstructor(db);

    app.route('/ppa/predicted').get(cors, controller.getPP);
    app.route('/ppa/teams').get(cors, controller.getPPAByTeam);
    app.route('/ppa/games').get(cors, controller.getPPAByGame);
    app.route('/ppa/players/games').get(cors, controller.getPPAByPlayerGame);
    app.route('/ppa/players/season').get(cors, controller.getPPAByPlayerSeason);
    app.route('/metrics/wp').get(cors, controller.getWP);
    app.route('/metrics/wp/pregame').get(cors, controller.getPregameWP);
}