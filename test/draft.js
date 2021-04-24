const db = require('./config').db;
const draft = require('../app/draft/draft.service')(db);

const chai = require('chai');
const should = chai.should();

describe('Drafts', () => {
    it('should retrieve a list of nfl teams', async () => {
        const data = await draft.getTeams();

        data.should.be.an("array");
        data.length.should.be.gt(0);
    });

    it('should retrieve a list of nfl positions', async () => {
        const data = await draft.getPositions();

        data.should.be.an("array");
        data.length.should.be.gt(0);
    });

    it('should retrieve a list picks in the year 2020', async () => {
        const data = await draft.getPicks(2020);

        data.should.be.an("array");
        data.length.should.be.gt(0);
        for (let pick of data) {
            pick.year.should.equal(2020);
        }
    });

    it('should retrieve a list picks in the year 2020 from alabama', async () => {
        const data = await draft.getPicks(2020, null, 'Alabama');

        data.should.be.an("array");
        data.length.should.be.gt(0);
        for (let pick of data) {
            pick.year.should.equal(2020);
            pick.collegeTeam.should.equal('Alabama');
        }
    });

    it('should retrieve a list picks in the year 2020 for Detroit', async () => {
        const data = await draft.getPicks(2020, 'Detroit');

        data.should.be.an("array");
        data.length.should.be.gt(0);
        for (let pick of data) {
            pick.year.should.equal(2020);
            pick.nflTeam.should.equal('Detroit');
        }
    });

    it('should retrieve a list picks in the year 2020 from the big ten', async () => {
        const data = await draft.getPicks(2020, null, null, 'B1G');

        data.should.be.an("array");
        data.length.should.be.gt(0);
        for (let pick of data) {
            pick.year.should.equal(2020);
            pick.collegeConference.should.equal('Big Ten');
        }
    });

    it('should retrieve a list of running back picks in the year 2020', async () => {
        const data = await draft.getPicks(2020, null, null, null, 'RB');

        data.should.be.an("array");
        data.length.should.be.gt(0);
        for (let pick of data) {
            pick.year.should.equal(2020);
            pick.position.should.equal('Running Back');
        }
    });
})