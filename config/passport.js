const bearerStrategy = require('./strategies/bearer');

module.exports = (passport, authDb) => {
    bearerStrategy(passport, authDb);
};
