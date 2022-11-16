const Strategy = require('passport-http-bearer').Strategy;

module.exports = (passport, authDb) => {
    passport.use(new Strategy(async (token, cb) => {
        try {
            const user = await authDb.oneOrNone(`SELECT * FROM "user" WHERE token = $1`, token);

            if (user) {
                return cb(null, {
                    id: user.id,
                    username: user.username,
                    patronLevel: user.patron_level,
                    blacklisted: user.blacklisted,
                    throttled: user.throttled
                });
            } else {
                return cb(null, false);
            }
        } catch (err) {
            return cb(err);
        }
    }));
};