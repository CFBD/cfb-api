module.exports = (app, db, cors) => {
    const controller = require('./team.controller')(db);

    app.route('/teams').get(cors, controller.getTeams);
    app.route('/roster').get(cors, controller.getRoster);
    app.route('/conferences').get(cors, controller.getConferences);
    app.route('/talent').get(cors, controller.getTeamTalent);
    app.route('/teams/matchup').get(cors, controller.getMatchup);
}