module.exports = async () => {
    const express = require('express');

    const helmet = require('helmet');
    const bodyParser = require('body-parser');
    const session = require('cookie-session');
    const cookieParser = require('cookie-parser');
    const path = require('path');
    const fs = require('fs');
    const morgan = require('morgan');

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

    const dbInfo = require('./database')();

    const accessLogStream = fs.createWriteStream(path.join(__dirname, '../access.log'), {
        flags: 'a'
    });
    app.use(morgan('combined', {
        stream: accessLogStream,
        skip: (req, res) => {
            return !req.path ||
                req.path == '' ||
                req.path == '/' ||
                req.path.indexOf('vendor') != -1 ||
                req.path.indexOf('css') != -1
                || req.path.indexOf('utils') != -1
                || req.path.indexOf('locales') != -1
                || req.path.indexOf('main.js') != -1
                || req.path.indexOf('api_') != -1;
        }
    }));

    app.use(postgraphile(dbInfo.connectionString, 'public', {
        disableDefaultMutations: true,
        graphiql: true
    }));

    // require('../app/coach/coach.route')(app, db.Coach);
    require('../app/game/game.route')(app, dbInfo.db);
    require('../app/team/team.route')(app, dbInfo.db);
    require('../app/venue/venue.route')(app, dbInfo.db);

    app.use(express.static(path.join(__dirname, '../doc')));

    app.get('*', (req, res) => {
        res.sendfile(path.join(__dirname, '../doc/index.html'));
    });

    return app;
}