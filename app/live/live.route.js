module.exports = async (app, db, patreonMiddlewares, Sentry) => {
    const controller = await require('./live.controller')(db, Sentry);

    app.route('/live/plays').get(patreonMiddlewares, controller.getPlays);
};
