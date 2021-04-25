const db = require('./config').db;
const players = require('../app/player/player.service')(db);

const chai = require('chai');
const should = chai.should();

describe('Players', () => {
    describe('Search', () => {
        it('it should search for players named "Smith"', async () => {
            const data = await players.playerSearch(null, null, null, 'Smith');
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
        });

        it('it should search for inactive QBs named "Smith"', async () => {
            const data = await players.playerSearch(2014, null, 'QB', 'Smith');

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
            const data = await players.getPlayerUsage(2019, null, null, 'Michigan', null, 'false');
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
        });

        it('it should get player usage chart data for a specific player', async () => {
            const data = await players.getPlayerUsage(2019, null, null, null, 4035409, null);
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
        });
    });

    describe('Returning Production', () => {
        it('it should get returning production data for the given year', async () => {
            const data = await players.getReturningProduction(2019, null, null);
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.season))).length.should.equal(1);
        });

        it('it should get returning production data for the given team', async () => {
            const data = await players.getReturningProduction(null, 'michigan', null);
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.team))).length.should.equal(1);
        });

        it('it should get returning production data for the given conference', async () => {
            const data = await players.getReturningProduction(null, null, 'SEC');
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.conference))).length.should.equal(1);
        });
    });

    describe('Season Stats', () => {
        it('it should get player stats for a given season and conference', async () => {
            const data = await players.getSeasonStats(2019, 'B1G');
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.season))).length.should.equal(1);
            Array.from(new Set(data.map(d => d.conference))).length.should.equal(1);
        });
        
        it('it should get player stats for a given season and team', async () => {
            const data = await players.getSeasonStats(2019, null, 'Akron');
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.season))).length.should.equal(1);
            Array.from(new Set(data.map(d => d.team))).length.should.equal(1);
        });
        
        it('it should get player stats for a given season and category', async () => {
            const data = await players.getSeasonStats(2019, null, null, null, null, null, 'kicking');
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.season))).length.should.equal(1);
            Array.from(new Set(data.map(d => d.category))).length.should.equal(1);
        });
        
        it('it should get player stats for a given season and range of weeks', async () => {
            const data = await players.getSeasonStats(2019, null, null, 4, 8);
            
            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.season))).length.should.equal(1);
        });
    });
});