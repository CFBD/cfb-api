module.exports = (app, db, cors) => {
    const controller = require('./game.controller')(db);

    app.route('/games').get(cors, controller.getGames);
    app.route('/games/teams').get(cors, controller.getTeamStats);
    app.route('/drives').get(cors, controller.getDrives);
    app.route('/games/players').get(cors, controller.getPlayerStats);
}