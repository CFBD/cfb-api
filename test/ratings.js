const db = require('./config').db;
const ratings = require('../app/ratings/ratings.service')(db);

const chai = require('chai');
const should = chai.should();

describe('Ratings', () => {
    describe('Team SP', () => {
        it('it should get SP+ ratings by year', async () => {
            const data = await ratings.getSP(2019, null);

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.year))).length.should.equal(1);
            Array.from(new Set(data.filter(d => d.team !== 'nationalAverages').map(d => d.team))).length.should.be.gt(1);
        });

        it('it should get SP+ ratings by team', async () => {
            const data = await ratings.getSP(null, 'Michigan');

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.year))).length.should.be.gt(1);
            Array.from(new Set(data.filter(d => d.team !== 'nationalAverages').map(d => d.team))).length.should.equal(1);
        });

        it('it should get SP+ ratings by year and team', async () => {
            const data = await ratings.getSP(2019, 'Michigan');

            data.should.be.an('array');
            data.filter(d => d.team !== 'nationalAverages').length.should.equal(1);
        });
    });

    describe('Conference SP', () => {
        it('it should get SP+ ratings', async () => {
            const data = await ratings.getConferenceSP(null, null);

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.year))).length.should.be.gt(1);
            Array.from(new Set(data.map(d => d.conference))).length.should.be.gt(1);
        });

        it('it should get SP+ ratings by year', async () => {
            const data = await ratings.getConferenceSP(2019, null);

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.year))).length.should.equal(1);
            Array.from(new Set(data.map(d => d.conference))).length.should.be.gt(1);
        });

        it('it should get SP+ ratings by conference', async () => {
            const data = await ratings.getConferenceSP(null, 'B1G');

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.year))).length.should.be.gt(1);
            Array.from(new Set(data.map(d => d.conference))).length.should.equal(1);
        });

        it('it should get SP+ ratings by conference and year', async () => {
            const data = await ratings.getConferenceSP(2019, 'B1G');

            data.should.be.an('array');
            data.length.should.equal(1);
        });
    });

    describe('SRS', () => {
        it('it should get SRS ratings by year', async () => {
            const data = await ratings.getSRS(2019, null, null);

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.year))).length.should.equal(1);
            Array.from(new Set(data.map(d => d.team))).length.should.be.gt(1);
            Array.from(new Set(data.map(d => d.conference))).length.should.be.gt(1);
        });

        it('it should get SRS ratings by team', async () => {
            const data = await ratings.getSRS(null, 'michigan', null);

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.team))).length.should.equal(1);
            Array.from(new Set(data.map(d => d.year))).length.should.be.gt(1);
            Array.from(new Set(data.map(d => d.conference))).length.should.be.gt(1);
        });

        it('it should get SRS ratings by conference', async () => {
            const data = await ratings.getSRS(null, null, 'B1G');

            data.should.be.an('array');
            data.length.should.be.gt(0);
            Array.from(new Set(data.map(d => d.conference))).length.should.equal(1);
            Array.from(new Set(data.map(d => d.team))).length.should.be.gt(1);
            Array.from(new Set(data.map(d => d.year))).length.should.be.gt(1);
        });
    })
});