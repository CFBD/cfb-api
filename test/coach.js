const db = require('./config').db;
const coaches = require('../app/coach/coach.service')(db);

const chai = require('chai');
const should = chai.should();

describe('Coaches', () => {
    it('should retrieve coach data by first name', async () => {
        const data = await coaches.getCoaches('Nick');

        data.should.be.an("array");
        data.length.should.be.gt(0);
        Array.from(new Set(data.map(d => d.first_name))).length.should.equal(1);
    });
    
    it('should retrieve coach data by last name', async () => {
        const data = await coaches.getCoaches(null, 'Smith');

        data.should.be.an("array");
        data.length.should.be.gt(0);
        Array.from(new Set(data.map(d => d.last_name))).length.should.equal(1);
    });

    it('should retrieve coach data by team', async () => {
        const data = await coaches.getCoaches(null, null, 'Ohio State');

        data.should.be.an("array");
        data.length.should.be.gt(0);
        for (let coach of data) {
            for (let season of coach.seasons) {
                season.school.should.equal('Ohio State');
            }
        }
    });

    it ('should retrieve coach data for a single season', async () => {
        const data = await coaches.getCoaches(null, null, null, 2019);

        data.should.be.an("array");
        data.length.should.be.gt(0);
        for (let coach of data) {
            for (let season of coach.seasons) {
                season.year.should.equal(2019);
            }
        }
    });

    it ('should retrieve coach data between a range of years', async () => {
        const data = await coaches.getCoaches(null, null, null, null, 2015, 2018);

        data.should.be.an("array");
        data.length.should.be.gt(0);
        for (let coach of data) {
            for (let season of coach.seasons) {
                season.year.should.be.gte(2015);
                season.year.should.be.lte(2018);
            }
        }
    });
})