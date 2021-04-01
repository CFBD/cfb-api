module.exports = (app, db, middlewares, Sentry) => {
    const controller = require('./team.controller')(db, Sentry);

    app.route('/teams').get(middlewares, controller.getTeams);
    app.route('/teams/fbs').get(middlewares, controller.getFBSTeams);
    app.route('/roster').get(middlewares, controller.getRoster);
    app.route('/conferences').get(middlewares, controller.getConferences);
    app.route('/talent').get(middlewares, controller.getTeamTalent);
    app.route('/teams/matchup').get(middlewares, controller.getMatchup);
}