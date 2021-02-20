const axios = require('axios');

module.exports = () => {
    const endpoint = process.env.AUTH_URL;

    const generateKey = async (email) => {
        await axios.post(endpoint, {
            email
        });
    };

    return {
        generateKey
    };
};
