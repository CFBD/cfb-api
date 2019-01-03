module.exports = (app, db, cors) => {
    const controller = require('./rankings.controller')(db);

    app.route('/rankings').get(cors, controller.getRankings);
}