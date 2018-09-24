(async() => {
    require('dotenv').config();

    const express = require('./config/express');
    const app = await express();
    
    app.listen(process.env.PORT, console.log(`Server running on port ${process.env.PORT}`)); //eslint-disable-line
})().catch(err => {
    console.error(err);
});