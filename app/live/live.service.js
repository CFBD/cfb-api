const axios = require('axios');

module.exports = async (db) => {
    const PLAYS_URL = process.env.PLAYS_URL;

    // const epaTypes = [8,12,13,14,15,16,17,18,21,29,40,41,43,52,53,56,57,59,60,61,62,65,66,67,999,78];
    const epaTypes = [3,4,6,7,24,26,36,51,67,5,9,29,39,68,18,38,40,41,59,60];
    const passTypes = [3,4,6,7,24,26,36,37,38,39,51,67];
    const rushTypes = [5,9,29,39,68];
    const unsuccessfulTypes = [20,26,34,36,37,38,39,63];
    const ppas = await db.any('SELECT yard_line, down, distance, ROUND(predicted_points, 3) AS ppa FROM ppa');

    const getPlaySuccess = (play) => {
        const typeId = parseInt(play.type.id);
        return !unsuccessfulTypes.includes(typeId) && (play.scoringPlay
            || (play.start.down == 1 && play.statYardage >= (play.start.distance / 2))
            || (play.start.down == 2 && play.statYardage >= (play.start.distance * .7))
            || (play.start.down > 2 && play.statYardage >= play.start.distance));
    };

    const getPlayType = (play) => {
        const typeId = parseInt(play.type.id);
        if (passTypes.includes(typeId)) {
            return 'pass';
        }

        if (rushTypes.includes(typeId)) {
            return 'rush';
        }

        return 'other';
    };

    const getDownType = (play) => {
        return ((play.start.down == 2 && play.start.distance >= 7) || (play.start.down > 2 && play.start.distance >= 5)) ? 'passing' : 'standard';
    };

    const getGarbageTime = (play) => {
        let score = Math.abs(play.homeScore - play.awayScore);

        if (play.scoringPlay && play.scoringType.abbreviation == 'TD') {
            score -= 7;
        } else if (play.scoringPlay && play.scoringType.abbreviation == 'FG') {
            score -= 3;
        }

        return (play.period == 2 && score <= 38)
            || (play.period == 3 && score <= 28)
            || (play.period == 4 && score <= 22);
    }

    const getPlays = async (id) => {
        const result = await axios.get(PLAYS_URL, {
            params: {
                gameId: id,
                xhr: 1,
                render: false
            }
        });

        let comp = result.data.gamepackageJSON.header.competitions[0];
        let teams = comp.competitors;
        let driveData = result.data.gamepackageJSON.drives.previous;

        let drives = [];
        let plays = [];

        if (result.data.gamepackageJSON.drives.current && !driveData.find(d => d.id == result.data.gamepackageJSON.drives.current.id)) {
            driveData.push(result.data.gamepackageJSON.drives.current);
        }

        for (let drive of driveData) {
            let offense = teams.find(t => t.team.displayName == drive.team.displayName);
            let defense = teams.find(t => t.team.displayName != offense.displayName);

            let d = {
                id: drive.id,
                offenseId: offense.team.id,
                offense: offense.team.location,
                defenseId: defense.team.id,
                defense: defense.team.location,
                playCount: drive.offensivePlays,
                yards: drive.yards,
                startPeriod: drive.start.period.number,
                startClock: drive.start.clock ? drive.start.clock.displayValue : null,
                startYardsToGoal: offense.homeAway == 'home' ? 100 - drive.start.yardLine : drive.start.yardLine,
                endPeriod: drive.end ? drive.end.period.number : null,
                endClock: drive.end && drive.end.clock ? drive.end.clock.displayValue : null,
                endYardsToGoal: drive.end ? offense.homeAway == 'home' ? 100 - drive.end.yardLine : drive.end.yardLine : null,
                duration: drive.timeElapsed ? drive.timeElapsed.displayValue : null,
                scoringOpportunity: false,
                plays: [],
                result: drive.displayResult
            };

            for (let play of drive.plays) {
                let playTeam = play.start.team.id == offense.team.id ? offense.team : defense.team;
                let epa = null;
                if (epaTypes.includes(parseInt(play.type.id))) {
                    let startingEP = ppas.find(ppa => ppa.down == play.start.down && ppa.distance == play.start.distance && ppa.yard_line == play.start.yardsToEndzone);
                    let endingEP = null;
                    
                    if (play.scoringPlay) {
                        if (play.scoringType.abbreviation == 'TD') {
                            endingEP = play.end.team.id == offense.id ? {ppa: 6} : {ppa: -6};
                        } else if (play.scoringType.abbreviation == 'FG') {
                            endingEP = {ppa: 3};
                        }
                    } else {
                        endingEP = ppas.find(ppa => ppa.down == play.end.down && ppa.distance == play.end.distance && ppa.yard_line == play.end.yardsToEndzone);
                    }

                    if (startingEP && endingEP) {
                        epa = Math.round((parseFloat(endingEP.ppa) - parseFloat(startingEP.ppa)) * 1000) / 1000;
                    }
                }

                if (play.end.yardsToEndzone <= 40) {
                    d.scoringOpportunity = true;
                }

                let p = {
                    id: play.id,
                    homeScore: play.homeScore,
                    awayScore: play.awayScore,
                    period: play.period.number,
                    clock: play.clock ? play.clock.displayValue : null,
                    wallclock: play.wallclock,
                    teamId: playTeam.id,
                    team: playTeam.location,
                    down: play.start.down,
                    distance: play.start.distance,
                    yardsToGoal: play.start.yardsToEndzone,
                    yardsGained: play.statYardage,
                    playTypeId: play.type.id,
                    playType: play.type.text,
                    epa: epa,
                    garbageTime: getGarbageTime(play),
                    success: getPlaySuccess(play),
                    rushPass: getPlayType(play),
                    downType: getDownType(play),
                    playText: play.text
                };

                d.plays.push(p);
                plays.push(p);
            }

            let first = d.plays[0];
            let last = d.plays[d.plays.length - 1];
            let scoreDiff = (last.homeScore - last.awayScore) - (first.homeScore - first.awayScore);
            
            if (offense.homeAway == 'away') {
                scoreDiff *= -1;
            }

            d.pointsGained = scoreDiff;

            drives.push(d);
        }

        let teamStats = teams.map(t => {
            let teamDrives = drives.filter(d => d.offenseId == t.team.id);
            let scoringOpps = teamDrives.filter(d => d.scoringOpportunity);
            let teamPlays = plays.filter(p => p.epa && p.teamId == t.team.id);
            let rushingPlays = teamPlays.filter(p => p.rushPass == 'rush');
            let passingPlays = teamPlays.filter(p => p.rushPass == 'pass');
            let standardDowns = teamPlays.filter(p => p.downType == 'standard');
            let passingDowns = teamPlays.filter(p => p.downType == 'passing');
            let successfulPlays = teamPlays.filter(p => p.success);

            let lineYards = rushingPlays.map(r => {
                if (r.yardsGained < 0) {
                    return -1.2 & r.yardsGained;
                } else if (r.yardsGained <= 4) {
                    return r.yardsGained;
                } else if (r.yardsGained <= 10) {
                    return 4 + (r.yardsGained - 4) / 2;
                } else {
                    return 7;
                }
            }).reduce((p,v) => p + v, 0);

            let secondLevelYards = rushingPlays.map(r => {
                if (r.yardsGained <= 5) {
                    return 0;
                } else if (r.yardsGained < 10) {
                    return r.yardsGained - 5;
                } else {
                    return 5;
                }
            }).reduce((p,v) => p + v, 0);

            let openFieldYards = rushingPlays.map(r => {
                if (r.yardsGained <= 10) {
                    return 0;
                } else {
                    return r.yardsGained - 10;
                }
            }).reduce((p,v) => p + v, 0); 
            
            return {
                teamId: t.team.id,
                team: t.team.location,
                homeAway: t.homeAway,
                lineScores: t.lineScores,
                points: t.score,
                drives: teamDrives.length,
                scoringOpportunities: scoringOpps.length,
                pointsPerOpportunity: scoringOpps.length ? Math.round((scoringOpps.map(o => o.pointsGained).reduce((p,v) => p + v, 0) / scoringOpps.length) * 10) / 10 : 0,
                plays: teamPlays.length,
                lineYards,
                lineYardsPerRush: rushingPlays.length > 0 ? Math.round(lineYards * 10 / rushingPlays.length) / 10 : 0,
                secondLevelYards,
                secondLevelYardsPerRush: rushingPlays.length > 0 ? Math.round(secondLevelYards * 10 / rushingPlays.length) / 10 : 0,
                openFieldYards,
                openFieldYardsPerRush: rushingPlays.length > 0 ? Math.round(openFieldYards * 10 / rushingPlays.length) / 10 : 0,
                epaPerPlay: teamPlays.length ? Math.round((teamPlays.map(t => t.epa).reduce((p,v) => p + v, 0) / teamPlays.length) * 1000) / 1000 : 0,
                totalEpa: Math.round((teamPlays.map(t => t.epa).reduce((p,v) => p + v, 0)) * 10) / 10,
                passingEpa: Math.round((passingPlays.map(t => t.epa).reduce((p,v) => p + v, 0)) * 10) / 10,
                epaPerPass: passingPlays.length ? Math.round((passingPlays.map(t => t.epa).reduce((p,v) => p + v, 0) / passingPlays.length) * 1000) / 1000 : 0,
                rushingEpa: Math.round((rushingPlays.map(t => t.epa).reduce((p,v) => p + v, 0)) * 10) / 10,
                epaPerRush: rushingPlays.length ? Math.round((rushingPlays.map(t => t.epa).reduce((p,v) => p + v, 0) / rushingPlays.length) * 1000) / 1000 : 0,
                successRate: teamPlays.length ? Math.round((teamPlays.map(t => t.success ? 1 : 0).reduce((p,v) => p + v, 0) / teamPlays.length) * 1000) / 1000 : 0,
                standardDownSuccessRate: standardDowns.length ? Math.round((standardDowns.map(t => t.success ? 1 : 0).reduce((p,v) => p + v, 0) / standardDowns.length) * 1000) / 1000 : 0,
                passingDownSuccessRate: passingDowns.length ? Math.round((passingDowns.map(t => t.success ? 1 : 0).reduce((p,v) => p + v, 0) / passingDowns.length) * 1000) / 1000 : 0,
                explosiveness: successfulPlays.length ? Math.round((successfulPlays.map(t => t.epa).reduce((p,v) => p + v, 0) / successfulPlays.length) * 1000) / 1000 : 0
            }
        });

        let currentDrive = result.data.gamepackageJSON.drives.current;
        let currentPlay = currentDrive && currentDrive.plays && currentDrive.plays.length ? currentDrive.plays[currentDrive.plays.length - 1] : null;

        return {
            id: result.data.gameId,
            status: comp.status.type.description,
            period: comp.status.period,
            clock: comp.status.displayClock,
            possession: currentDrive ? teams.find(t => t.team.displayName == currentDrive.team.displayName).team.location : null,
            down: currentPlay && currentPlay.end ? currentPlay.end.down : null,
            distance: currentPlay && currentPlay.end ? currentPlay.end.distance : null,
            yardsToGoal: currentPlay && currentPlay.end ? currentPlay.end.yardsToEndzone : null,
            teams: teamStats,
            drives: drives
        };
    };


    return {
        getPlays
    }
};
