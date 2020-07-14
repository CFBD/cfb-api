const controllerConstructor = require('./ratings.controller');

module.exports = (app, db, cors, Sentry) => {
    const controller = controllerConstructor(db, Sentry);

    app.route('/ratings/sp').get(cors, controller.getSP);
    app.route('/ratings/sp/conferences').get(cors, controller.getConferenceSP);
    app.route('/ratings/srs').get(cors, controller.getSRS)
};
