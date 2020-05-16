module.exports = () => {
    const user = process.env.DATABASE_USER;
    const password = process.env.DATABASE_PASSWORD;
    const host = process.env.HOST;
    const port = process.env.DATABASE_PORT;
    const dbName = process.env.DATABASE;

    const pgp = require('pg-promise');
    const promise = require('bluebird');

    const connectionString = `postgres://${user}:${password}@${host}:${port}/${dbName}`;
    const dbCreator = pgp({
        promiseLib: promise
    });

    console.log(connectionString);

    const db = dbCreator(connectionString);

    return {
        connectionString,
        db
    }
}