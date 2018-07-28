module.exports = async () => {
    const express = require('express');

    const helmet = require('helmet');
    const bodyParser = require('body-parser');
    const session = require('cookie-session');
    const cookieParser = require('cookie-parser');

    const {
        postgraphile
    } = require('postgraphile');

    const app = express();

    app.enable('trust proxy');

    app.use(helmet());
    app.use(session({
        name: 'session',
        secret: process.env.SESSION_SECRET,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secureProxy: true
    }));
    app.use(cookieParser());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    const db = require('./database')();

    app.use(postgraphile(db.connectionString, 'public', {
        disableDefaultMutations: true,
        graphiql: true
    }));

    // require('../app/coach/coach.route')(app, db.Coach);

    return app;
}