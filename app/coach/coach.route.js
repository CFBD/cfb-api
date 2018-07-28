module.exports = (app, coaches) => {
    const controller = require('./coach.controller')(coaches);

    app.route('/coach/list').get(controller.getList);
    app.route('/coach').get(controller.getCoach);
}