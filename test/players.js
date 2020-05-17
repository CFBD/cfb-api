const db = require('./config').db;
const players = require('../app/player/player.service')(db);

const chai = require('chai');
const should = chai.should();

describe('Players', () => {
    describe('Search', () => {
        it('it should search for players named "Smith"', async () => {
            const data = await players.playerSearch(true, null, null, 'Smith');
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
        });

        it('it should search for inactive QBs named "Smith"', async () => {
            const data = await players.playerSearch(null, null, 'QB', 'Smith');

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.position))).length.should.equal(1);
        });
    });

    describe('Passing Charts', () => {
        it('it should get a passing chart for the specified player (no rolling specified)', async () => {
            const data = await players.getMeanPassingChartData(4035409);
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
        });

        it('it should get a passing chart for the specified player (10 rolling plays)', async () => {
            const data = await players.getMeanPassingChartData(4035409, 10);
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
        });
    });

    describe('Player Usage', () => {
        it('it should get player usage chart data', async () => {
            const data = await players.getPlayerUsage(2019, 'B1G', 'QB', null, null, 'true');
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
        });

        it('it should get player usage chart data by team', async () => {
            const data = await players.getPlayerUsage(2019, null, null, 'Michigan', null, 'false')
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
        });

        it('it should get player usage chart data for a specific player', async () => {
            const data = await players.getPlayerUsage(2019, null, null, null, 4035409, null);
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
        });
    });
});