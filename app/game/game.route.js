module.exports = (app, db) => {
    const controller = require('./game.controller')(db);

    app.route('/games').get(controller.getGames);
    app.route('/games/teams').get(controller.getTeamStats);
    app.route('/drives').get(controller.getDrives);
    app.route('/games/players').get(controller.getPlayerStats);
}