module.exports = (app, db) => {
    const controller = require('./play.controller')(db);

    app.route('/plays').get(controller.getPlays);
    app.route('/play/types').get(controller.getPlayTypes);
}