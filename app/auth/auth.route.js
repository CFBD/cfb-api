module.exports = (app, cors, Sentry, patreonAuth) => {
    const controller = require('./auth.controller')(Sentry);

    app.options('/auth/key', cors);
    app.route('/auth/key').post(cors, controller.generateKey);
    app.route('/auth/graphql').get(patreonAuth, controller.graphQLAuth);
};
