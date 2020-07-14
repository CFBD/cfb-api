const linesController = require('./lines.controller');

module.exports = (app, db, cors, Sentry) => {
    const controller = linesController(db, Sentry);

    app.route('/lines').get(cors, controller.getLines);
};
