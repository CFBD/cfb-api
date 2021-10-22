const Sentry = require('@sentry/node');

(async() => {
    require('dotenv').config();
    Sentry.init({ dsn: `https://${process.env.SENTRY_KEY}@sentry.io/${process.env.SENTRY_ID}`, debug: process.env.NODE_ENV != 'production' });

    const express = require('./config/express');
    const app = await express(Sentry);
    
    app.listen(process.env.PORT, console.log(`Server running on port ${process.env.PORT}`)); //eslint-disable-line
})().catch(err => {
    Sentry.captureException(err);
});