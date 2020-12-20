module.exports = (app, db, cors, speedLimiter, Sentry) => {
    const controller = require('./game.controller')(db, Sentry);

    app.route('/games').get(cors, controller.getGames);
    app.route('/games/teams').get(cors, controller.getTeamStats);
    app.route('/drives').get(cors, speedLimiter, controller.getDrives);
    app.route('/games/players').get(cors, controller.getPlayerStats);
    app.route('/records').get(cors, controller.getRecords);
    app.route('/games/media').get(cors, controller.getMedia);
    app.route('/calendar').get(cors, controller.getCalendar);
}