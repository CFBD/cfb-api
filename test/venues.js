const db = require('./config').db;
const service = require('../app/venue/venue.service')(db);

const chai = require('chai');
const should = chai.should();

describe('Ratings', () => {
    it('it should get SP+ ratings by year', async () => {
        const venues = await service.getVenues();

        venues.should.be.an('array');
        venues.length.should.be.gt(0);
    });
});
