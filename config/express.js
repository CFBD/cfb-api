module.exports = async (Sentry) => {
    const express = require('express');
    const expressWs = require('express-ws');

    const helmet = require('helmet');
    const bodyParser = require('body-parser');
    const session = require('cookie-session');
    const cookieParser = require('cookie-parser');
    const cors = require('cors');
    const swStats = require('swagger-stats');

    const passport = require('passport');
    const passportConfig = require('./passport');

    let corsOptions;

    // if (process.env.NODE_ENV != 'development') {
    //     corsOptions = {
    //         origin: (origin, cb) => {
    //             if (origin == 'https://collegefootballdata.com' || origin == 'https://www.collegefootballdata.com' || !origin) {
    //                 cb(null, true);
    //             } else {
    //                 cb(new Error(`Not allowed by CORS: ${origin}`));
    //             }
    //         }
    //     };
    // } else {
        corsOptions = {};
    // }

    const app = express();
    const expressWsObj = expressWs(app);

    app.enable('trust proxy');

    app.use(Sentry.Handlers.requestHandler());

    app.use(helmet({
        contentSecurityPolicy: false
    }));
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
    passportConfig(passport, dbInfo.authDb);

    const auth = passport.authenticate('bearer', {
        session: false
    });

    require('./swagger')(app, cors);
    app.use('/api/docs', cors(), express.static('./node_modules/swagger-ui-dist'));

    app.use(swStats.getMiddleware({
        swaggerSpec: require('../swagger'),
        apdexThreshold: 250,
        authentication: true,
        onAuthenticate: (req, username, password) => {
            return username.toLowerCase() == process.env.USERNAME.toLowerCase() && password == process.env.PASSWORD
        }
    }));

    let corsConfig = cors(corsOptions);
    require('../app/auth/auth.route')(app, corsConfig, Sentry);
    require('../app/coach/coach.route')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/game/game.route')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/play/play.route')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/team/team.route')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/venue/venue.route')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/rankings/rankings.route')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/lines/lines.route')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/recruiting/recruiting.route')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/ratings/ratings.route')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/ppa/ppa.routes')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/stats/stats.routes')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/player/player.routes')(app, dbInfo.db, corsConfig, Sentry);

    const consumers = await require('./consumers')();
    await require('../app/events/events.route')(app, consumers, expressWsObj);

    app.get('*', (req, res) => {
        res.redirect('/api/docs/?url=/api-docs.json');
    });

    app.use(Sentry.Handlers.errorHandler());

    return app;
}