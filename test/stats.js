const db = require('./config').db;
const stats = require('../app/stats/stats.service')(db);

const chai = require('chai');
const should = chai.should();

describe('Team Stats', () => {
    describe('Categories', () => {
        it('Should get a list of team statistical categories', async () => {
            const categories = await stats.getCategories();

            categories.should.be.an('array');
            categories.length.should.be.gt(0);
        });
    });

    
    describe('Season', () => {
        it('Should retrieve team stats from a single conference', async () => {
            const data = await stats.getTeamStats(2019, null, 'B1G');

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(s => s.conference))).length.should.equal(1);
        });

        it('Should retrieve stats from a subset of weeks for a single team and season', async () => {
            const data = await stats.getTeamStats(2019, 'Michigan', null, 4, 10);

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(s => s.team))).length.should.equal(1);
            Array.from(new Set(data.map(s => s.season))).length.should.equal(1);
        });
    });

    describe('Advanced Season', () => {
        it('Should retrieve stats from a subset of weeks for a single team and season', async () => {
            const data = await stats.getAdvancedStats(2019, 'Texas', true, 4, 10);

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(s => s.team))).length.should.equal(1);
            Array.from(new Set(data.map(s => s.season))).length.should.equal(1);
        });
    });
    
    describe('Advanced Game', () => {
        it('Should retrieve team stats with garbage time excluded for a single team and season', async () => {
            const data = await stats.getAdvancedGameStats(2019, 'Texas', null, null, true);

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(s => s.conference))).length.should.equal(1);
            Array.from(new Set(data.map(s => s.team))).length.should.equal(1);
            Array.from(new Set(data.map(s => s.season))).length.should.equal(1);
        });

        it('Should retrieve team stats from a single week', async () => {
            const data = await stats.getAdvancedGameStats(2019, null, 4);

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(s => s.week))).length.should.equal(1);
        });

        it('Should retrieve team stats from a single opponent', async () => {
            const data = await stats.getAdvancedGameStats(2019, null, null, 'USC');

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(s => s.opponent))).length.should.equal(1);
        });
    });
    
    describe('Advanced Box Score', () => {
        it('Should retrieve box score data for a specific game', async () => {
            const data = await stats.getAdvancedBoxScore(4035409);

            data.should.be.an('object');
        })
    });
});