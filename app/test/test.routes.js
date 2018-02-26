module.exports = (app, coaches) => {
    const tests = require('./test.controller')(coaches);

    app.route('/test').get(tests.runTest);
    app.route('/data').get(tests.getData);
}