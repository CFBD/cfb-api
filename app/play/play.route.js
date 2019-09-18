module.exports = (app, db, cors) => {
    const controller = require('./play.controller')(db);

    app.route('/plays').get(cors, controller.getPlays);
    app.route('/play/types').get(cors, controller.getPlayTypes);
    app.route('/play/stat/types').get(cors, controller.getPlayStatTypes);
    app.route('/play/stats').get(cors, controller.getPlayStats);
}