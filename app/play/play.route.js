module.exports = (app, db, middlewares, Sentry) => {
    const controller = require('./play.controller')(db, Sentry);

    app.route('/plays').get(middlewares, controller.getPlays);
    app.route('/play/types').get(middlewares, controller.getPlayTypes);
    app.route('/play/stat/types').get(middlewares, controller.getPlayStatTypes);
    app.route('/play/stats').get(middlewares, controller.getPlayStats);
}