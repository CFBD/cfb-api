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
    const apmConfig = require('./apm');

    const env = process.env.NODE_ENV;
    const corsOrigin = process.env.CORS_ORIGIN;

    const brute = require('./brute')();

    let corsOptions;

    if (env != 'development') {
        corsOptions = {
            origin: (origin, cb) => {
                if (!origin || origin == corsOrigin) {
                    cb(null, true);
                } else {
                    cb(new Error(`Not allowed by CORS: ${origin}`));
                }
            }
        };
    } else {
        corsOptions = {};
    }

    let corsConfig = cors(corsOptions);

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
    const apm = apmConfig(dbInfo.authDb);

    const originAuth = (req, res, next) => {
        passport.authenticate('bearer', (err, user, info) => {
            if (user || req.get('origin') == corsOrigin || req.get('host') == corsOrigin || env == 'development') {
                req.user = user;
                next();
            } else if (user && user.blacklisted == true) {
                res.status(401).send('Account has been blacklisted.');
            } else {
                res.status(401).send('Unauthorized. Did you forget to add "Bearer " before your key? Go to CollegeFootballData.com to register for your free API key. See the CFBD Blog for examples on usage: https://blog.collegefootballdata.com/using-api-keys-with-the-cfbd-api.');
            }
        })(req, res, next);
    };

    const patreonAuth = (req, res, next) => {
        passport.authenticate('bearer', (err, user, info) => {
            if ((user && user.patronLevel && user.patronLevel > 0) || env == 'development') {
                req.user = user;
                next();
            } else {
                res.status(401).send('This endpoint is in limited beta and requires a Patreon subscription.');
            }
        })(req, res, next);
    };

    const superPatreonAuth = (req, res, next) => {
        passport.authenticate('bearer', (err, user, info) => {
            if ((user && user.patronLevel && user.patronLevel > 1) || env == 'development') {
                req.user = user;
                next();
            } else {
                res.status(401).send('This endpoint is in limited beta and requires a Patreon Tier 2 subscription.');
            }
        })(req, res, next);
    };

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

    const limiter = require('./slowdown')();

    const middlewares = [corsConfig, originAuth, apm, limiter];
    const patreonMiddlewares = [corsConfig, patreonAuth, apm, limiter];

    require('../app/auth/auth.route')(app, corsConfig, Sentry, superPatreonAuth);
    require('../app/coach/coach.route')(app, dbInfo.db, middlewares, Sentry);
    require('../app/game/game.route')(app, dbInfo.db, middlewares, Sentry, patreonMiddlewares);
    require('../app/play/play.route')(app, dbInfo.db, middlewares, Sentry);
    require('../app/team/team.route')(app, dbInfo.db, middlewares, Sentry);
    require('../app/venue/venue.route')(app, dbInfo.db, middlewares, Sentry);
    require('../app/rankings/rankings.route')(app, dbInfo.db, middlewares, Sentry);
    require('../app/lines/lines.route')(app, dbInfo.db, middlewares, Sentry);
    require('../app/recruiting/recruiting.route')(app, dbInfo.db, middlewares, Sentry);
    require('../app/ratings/ratings.route')(app, dbInfo.db, middlewares, Sentry);
    require('../app/ppa/ppa.routes')(app, dbInfo.db, middlewares, Sentry);
    require('../app/stats/stats.routes')(app, dbInfo.db, middlewares, Sentry);
    require('../app/player/player.routes')(app, dbInfo.db, middlewares, Sentry);
    require('../app/draft/draft.route')(app, dbInfo.db, middlewares, Sentry);
    await require('../app/live/live.route')(app, dbInfo.db, patreonMiddlewares, Sentry);

    const consumers = await require('./consumers')();
    await require('../app/events/events.route')(app, consumers, expressWsObj);

    app.get('*', (req, res) => {
        res.redirect('/api/docs/?url=/api-docs.json');
    });

    app.use(Sentry.Handlers.errorHandler());

    return app;
}