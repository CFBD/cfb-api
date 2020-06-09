const db = require('./config').db;
const lines = require('../app/lines/lines.service')(db);

const chai = require('chai');
const should = chai.should();
const assert = chai.assert;

describe('Betting Lines', () => {
    it('Should retrieve betting lines for a given game id', async () => {
        const data = await lines.getLines(401117500);

        data.should.be.an('array');
        data.length.should.be.gt(0);
    });

    it('Should retrieve betting lines for a given season', async () => {
        const data = await lines.getLines(null, 2019);

        data.should.be.an('array');
        data.length.should.be.gt(0);
        Array.from(new Set(data.map(l => l.season))).length.should.equal(1);
    });

    it('Should retrieve betting lines for a given season and week', async () => {
        const data = await lines.getLines(null, 2019, null, 5);

        data.should.be.an('array');
        data.length.should.be.gt(0);
        Array.from(new Set(data.map(l => l.season))).length.should.equal(1);
        Array.from(new Set(data.map(l => l.week))).length.should.equal(1);
    });

    it('Should retrieve betting lines for a given season and team', async () => {
        const data = await lines.getLines(null, 2019, null, null, 'Nebraska');

        data.should.be.an('array');
        data.length.should.be.gt(0);
        Array.from(new Set(data.map(l => l.season))).length.should.equal(1);

        for (let line of data) {
            assert(line.homeTeam === 'Nebraska' || line.awayTeam === 'Nebraska', 'Team parameter not working.')
        }
    });

    it('Should retrieve betting lines for a given season and home team', async () => {
        const data = await lines.getLines(null, 2019, null, null, null, 'Nebraska');

        data.should.be.an('array');
        data.length.should.be.gt(0);
        Array.from(new Set(data.map(l => l.season))).length.should.equal(1);
        Array.from(new Set(data.map(l => l.homeTeam))).length.should.equal(1);
    });

    it('Should retrieve betting lines for a given season and away team', async () => {
        const data = await lines.getLines(null, 2019, null, null, null, null, 'Nebraska');

        data.should.be.an('array');
        data.length.should.be.gt(0);
        Array.from(new Set(data.map(l => l.season))).length.should.equal(1);
        Array.from(new Set(data.map(l => l.awayTeam))).length.should.equal(1);
    });
    
    it('Should retrieve betting lines for a given season and conference', async () => {
        const data = await lines.getLines(null, 2019, null, null, null, null, null, 'MAC');

        data.should.be.an('array');
        data.length.should.be.gt(0);
        Array.from(new Set(data.map(l => l.season))).length.should.equal(1);

        for (let line of data) {
            assert(line.homeConference === 'Mid-American' || line.awayConference === 'Mid-American', 'Conference parameter not working.')
        }
    });
});
