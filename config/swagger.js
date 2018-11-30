module.exports = (app, cors) => {
    const swaggerSpec = require('../swagger');

    app.get('/api-docs.json', cors(), (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}