const slowDown = require('express-slow-down');

module.exports = () => {
    const speedLimiter = slowDown({
        windowMs: 10 * 1000,
        delayAfter: 10,
        delayMs: 300,
        keyGenerator: (req) => {
            return req.user.username;
        }
    });

    const speedLimiterTier1 = slowDown({
        windowMs: 10 * 1000,
        delayAfter: 15,
        delayMs: 200,
        keyGenerator: (req) => {
            return req.user.username;
        }
    });

    const speedLimiterTier2 = slowDown({
        windowMs: 10 * 1000,
        delayAfter: 20,
        delayMs: 100,
        keyGenerator: (req) => {
            return req.user.username;
        }
    });

    const speedLimiterLive = slowDown({
        windowMs: 10 * 1000,
        delayAfter: 10,
        delayMs: 500,
        keyGenerator: (req) => {
            return req.user.username;
        }
    });

    const limiter = (req, res, next) => {
        let tier = req.user ? req.user.patronLevel : null;

        if (req.sws.api_path == '/live/plays') {
            speedLimiterLive(req, res, next);
        } else if (tier == 2) {
            speedLimiterTier2(req, res, next);
        } else if (tier == 1) {
            speedLimiterTier1(req, res, next);
        } else {
            speedLimiter(req, res, next);
        }
    }

    return limiter;
}