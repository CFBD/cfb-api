const linesController = require('./lines.controller');

module.exports = (app, db, middlewares, Sentry) => {
    const controller = linesController(db, Sentry);

    app.route('/lines').get(middlewares, controller.getLines);
};
