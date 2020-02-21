const controllerConstructor = require('./ratings.controller');

module.exports = (app, db, cors) => {
    const controller = controllerConstructor(db);

    app.route('/ratings/sp').get(cors, controller.getSP);
    app.route('/ratings/sp/conferences').get(cors, controller.getConferenceSP);
    app.route('/ratings/srs').get(cors, controller.getSRS)
};
