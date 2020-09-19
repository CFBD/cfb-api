const crypto = require('crypto');

module.exports = (authDb) => {
    const generateKey = async (email) => {
        const cleaned = email.toLowerCase().trim();
        const user = await authDb.oneOrNone('SELECT * FROM "user" WHERE LOWER(username) = $1', [cleaned]);

        if (!user) {
            const key = crypto.randomBytes(48).toString('hex');
            await authDb.none('INSERT INTO "user" (username, token) VALUES ($1, $2)', [cleaned, key]);
        }
    };

    return {
        generateKey
    };
};
