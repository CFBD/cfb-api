const controllerConstructor = require('./ratings.controller');

module.exports = (app, db, middlewares, Sentry) => {
    const controller = controllerConstructor(db, Sentry);

    app.route('/ratings/sp').get(middlewares, controller.getSP);
    app.route('/ratings/sp/conferences').get(middlewares, controller.getConferenceSP);
    app.route('/ratings/srs').get(middlewares, controller.getSRS);
    app.route('/ratings/elo').get(middlewares, controller.getElo);
    app.route('/ratings/fpi').get(middlewares, controller.getFpi);
};
