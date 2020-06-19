const db = require('./config').db;
const service = require('../app/game/game.service')(db);

const chai = require('chai');
const should = chai.should;
const assert = chai.assert;

describe('Games', () => {
    describe('Media', () => {
        it('Should retrieve game media for the given year', async () => {
            const data = await service.getMedia(2019);

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.season))).length.should.equal(1);
        });

        
        it('Should retrieve game media for the given year and week', async () => {
            const data = await service.getMedia(2019, null, 5);

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.season))).length.should.equal(1);
            Array.from(new Set(data.map(d => d.week))).length.should.equal(1);
        });

        it('Should retrieve game media for the given year and team', async () => {
            const data = await service.getMedia(2019, null, null, 'UCLA');

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.season))).length.should.equal(1);

            for (let game of data) {
                assert(game.homeTeam === 'UCLA' || game.awayTeam === 'UCLA', 'Team parameter not working')
            }
        });
        
        it('Should retrieve game media for the given year and conference', async () => {
            const data = await service.getMedia(2019, null, null, null, 'ACC');

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.season))).length.should.equal(1);

            for (let game of data) {
                assert(game.homeConference === 'ACC' || game.awayConference === 'ACC', 'Conference parameter not working');
            }
        });

        
        it('Should retrieve game media for the given year and media type', async () => {
            const data = await service.getMedia(2019, null, null, null, null, 'web');

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.season))).length.should.equal(1);
            Array.from(new Set(data.map(d => d.mediaType))).length.should.equal(1);
        });
    });
});