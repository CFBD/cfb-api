module.exports = (db) => {
    return async (req, res, next) => {
        if (process.env.ENABLE_METRICS == 'true' && req.user && req.user.id) {
            try {
                await db.none(`
                INSERT INTO metrics (user_id, endpoint, query, user_agent)
                VALUES ($1, $2, $3, $4)
            `, [req.user.id, req.sws.api_path, req.query, req.get('user-agent')]);
            } catch (err) {
                console.error(err);
                next();
            }
        }

        next();
    };
};