module.exports = (app, db, middlewares, Sentry) => {
    const controller = require('./draft.controller')(db, Sentry);

    app.route('/draft/teams').get(middlewares, controller.getTeams);
    app.route('/draft/positions').get(middlewares, controller.getPositions);
    app.route('/draft/picks').get(middlewares, controller.getPicks);
};
