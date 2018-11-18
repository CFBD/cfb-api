module.exports = (app) => {
    const swaggerSpec = require('../swagger');

    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}