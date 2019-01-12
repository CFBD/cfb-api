module.exports = async () => {
    const express = require('express');

    const helmet = require('helmet');
    const bodyParser = require('body-parser');
    const session = require('cookie-session');
    const cookieParser = require('cookie-parser');
    const cors = require('cors');
    const swStats = require('swagger-stats');

    let corsOptions;

    if (process.env.NODE_ENV != 'development') {
        corsOptions = {
            origin: (origin, cb) => {
                if (origin == 'https://collegefootballdata.com' || origin == 'https://www.collegefootballdata.com' || !origin) {
                    cb(null, true);
                } else {
                    cb(new Error(`Not allowed by CORS: ${origin}`));
                }
            }
        };
    } else {
        corsOptions = {};
    }

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

    require('./swagger')(app, cors);
    app.use('/api/docs', cors(), express.static('./node_modules/swagger-ui-dist'));

    app.use(swStats.getMiddleware({
        swaggerSpec: require('../swagger'),
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
    require('../app/coach/coach.route')(app, dbInfo.db, corsConfig);
    require('../app/game/game.route')(app, dbInfo.db, corsConfig);
    require('../app/play/play.route')(app, dbInfo.db, corsConfig);
    require('../app/team/team.route')(app, dbInfo.db, corsConfig);
    require('../app/venue/venue.route')(app, dbInfo.db, corsConfig);
    require('../app/rankings/rankings.route')(app, dbInfo.db, corsConfig);

    app.get('*', (req, res) => {
        res.redirect('/api/docs/?url=/api-docs.json');
    });

    return app;
}