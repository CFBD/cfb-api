module.exports = (app, db) => {
    const controller = require('./game.controller')(db);

    app.route('/drives').get(controller.getDrives);
    app.route('/plays').get(controller.getPlays);
}