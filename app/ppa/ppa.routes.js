const controllerConstructor = require('./ppa.controller');

module.exports = (app, db, cors) => {
    const controller = controllerConstructor(db);

    app.route('/ppa/predicted').get(cors, controller.getPP);
    app.route('/ppa/teams').get(cors, controller.getPPAByTeam);
    app.route('/metrics/wp').get(cors, controller.getWP);
}