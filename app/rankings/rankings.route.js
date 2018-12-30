module.exports = (app, db) => {
    const controller = require('./rankings.controller')(db);

    app.route('/rankings').get(controller.getRankings);
}