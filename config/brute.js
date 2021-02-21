const ExpressBrute = require('express-brute');
const PgStore = require('express-brute-pg');

module.exports = () => {
    const authDbUser = process.env.AUTH_DATABASE_USER;
    const authDbPassword = process.env.AUTH_DATABASE_PASSWORD;
    const authDbName = process.env.AUTH_DATABASE;
    const host = process.env.HOST;
    const port = process.env.DATABASE_PORT;

    var store = new PgStore({
        host,
        port,
        database: authDbName,
        user: authDbUser,
        password: authDbPassword
    });

    const bruteforce = new ExpressBrute(store, {
        freeRetries: 2,
        minWait: 1*60*60*1000,
        maxWait: 1*60*60*1000,
        failCallback: (req, res, next, nextValidRequestDate) => {
            res.sendStatus(200);
        },
        handleStoreError: (error) => {
            console.error(error);
        }
    });
    
    return bruteforce;
};
