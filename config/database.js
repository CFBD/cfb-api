module.exports = () => {
    const user = process.env.DATABASE_USER;
    const password = process.env.DATABASE_PASSWORD;
    const host = process.env.HOST;
    const port = process.env.DATABASE_PORT;
    const dbName = process.env.DATABASE;

    const authDbHost = process.env.AUTH_DATABASE_HOST;
    const authDbUser = process.env.AUTH_DATABASE_USER;
    const authDbPassword = process.env.AUTH_DATABASE_PASSWORD;
    const authDbName = process.env.AUTH_DATABASE;

    const pgp = require('pg-promise');
    const promise = require('bluebird');

    const connectionString = `postgres://${user}:${password}@${host}:${port}/${dbName}`;
    const authConnectionString = `postgres://${authDbUser}:${authDbPassword}@${authDbHost}:${port}/${authDbName}`;

    const dbCreator = pgp({
        promiseLib: promise
    });

    const db = dbCreator(connectionString);
    const authDb = dbCreator(authConnectionString);

    return {
        connectionString,
        db,
        authDb
    }
}