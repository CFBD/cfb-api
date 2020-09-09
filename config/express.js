module.exports = async (Sentry) => {
    const express = require('express');
    const expressWs = require('express-ws');

    const helmet = require('helmet');
    const bodyParser = require('body-parser');
    const session = require('cookie-session');
    const cookieParser = require('cookie-parser');
    const cors = require('cors');
    const swStats = require('swagger-stats');

    const slowDown = require('express-slow-down');
    const speedLimiter = slowDown({
        windowMs: 60 * 1000,
        delayAfter: 20,
        delayMs: 100,
        skipFailedRequests: true 
    });

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

    const {
        postgraphile
    } = require('postgraphile');

    const app = express();
    const expressWsObj = expressWs(app);

    app.enable('trust proxy');

    app.use(Sentry.Handlers.requestHandler());

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

    app.use(postgraphile(dbInfo.connectionString, 'public', {
        disableDefaultMutations: true,
        graphiql: true
    }));

    let corsConfig = cors(corsOptions);
    require('../app/coach/coach.route')(app, dbInfo.db, corsConfig, Sentry);
    require('../app/game/game.route')(app, dbInfo.db, corsConfig, speedLimiter, Sentry);
    require('../app/play/play.route')(app, dbInfo.db, corsConfig, speedLimiter, Sentry);
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