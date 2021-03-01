module.exports = (db) => {
    return async (req, res, next) => {
        if (req.user && req.user.id) {
            try {
                await db.none(`
                INSERT INTO metrics (user_id, endpoint, query)
                VALUES ($1, $2, $3)
            `, [req.user.id, req.sws.api_path, req.query]);
            } catch (err) {
                console.error(err);
            }
        }

        next();
    };
};