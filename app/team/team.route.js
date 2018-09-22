module.exports = (app, db) => {
    const controller = require('./team.controller')(db);

    app.route('/teams').get(controller.getTeams);
    app.route('/roster').get(controller.getRoster);
}