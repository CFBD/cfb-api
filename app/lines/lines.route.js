const linesController = require('./lines.controller');

module.exports = (app, db, cors) => {
    const controller = linesController(db);

    app.route('/lines').get(cors, controller.getLines);
};
