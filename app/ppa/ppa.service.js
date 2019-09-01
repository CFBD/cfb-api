const synaptic = require('synaptic');

module.exports = (db) => {
    const Architect = synaptic.Architect;
    const wpNetwork = Architect.Perceptron.fromJSON(require('./wpNetwork'));
    const wpKeys = require('./wpKeys');

    const getPP = async (down, distance) => {
        let results = await db.any(`
                SELECT (100 - yard_line) AS yardline, predicted_points
                FROM ppa
                WHERE down = $1 AND distance = $2
                ORDER BY yardline
        `, [down, distance]);

        return results.map(r => ({
            yardLine: r.yardline,
            predictedPoints: r.predicted_points
        }));
    };

    const renormalizeData = (inputs) => {
        let inputMins = wpKeys.input.mins;
        let inputMaxes = wpKeys.input.maxes;
        let inputNorm = [];
        for (let i = 0; i < inputs.length; i++) {
            inputNorm.push((inputs[i] - inputMins[i]) / (inputMaxes[i] - inputMins[i]));
        }

        // datum.normalizedInput = inputNorm;

        return inputNorm;
    }

    const getWP = async (gameId) => {
        let plays = await db.any(`
        SELECT 	g.id,
		        p.id AS play_id,
                p.play_text,
                home_team.id AS home_id,
                home_team.school AS home,
                away_team.id AS away_id,
                away_team.school AS away,
                COALESCE(gl.spread, 0) AS spread,
                CASE WHEN home.team_id = p.offense_id THEN true ELSE false END AS has_ball,
                p.home_score,
                p.away_score,
                (((4 - p.period) * 60 * 15) + EXTRACT(epoch FROM p.clock)) as time_remaining,
                CASE
                    WHEN (home.team_id = p.offense_id) OR (away.team_id = p.defense_id) THEN (100 - p.yard_line)
                    ELSE p.yard_line 
                END AS yard_line,
                p.down,
                p.distance
            FROM game AS g
            INNER JOIN game_team AS home ON g.id = home.game_id AND home.home_away = 'home'
            INNER JOIN team AS home_team ON home.team_id = home_team.id
            INNER JOIN game_team AS away ON g.id = away.game_id AND away.home_away = 'away'
            INNER JOIN team AS away_team ON away.team_id = away_team.id
            INNER JOIN drive AS d ON g.id = d.game_id
            INNER JOIN play AS p 
                ON d.id = p.drive_id 
                    AND p.play_type_id NOT IN (8,12,13,14,15,16,17,18,21,29,40,41,43,52,53,56,57,59,60,61,62,65,66,999,78)
                    AND p.period < 5
                    AND p.yard_line <= 99 
                    AND p.yard_line >= 1
                    AND p.down > 0 
                    AND p.down < 5 
                    AND p.distance <= CASE WHEN (home.team_id = p.offense_id) OR (away.team_id = p.defense_id) THEN (100 - p.yard_line) ELSE p.yard_line END
                    AND p.distance >= 1
            LEFT JOIN game_lines AS gl ON g.id = gl.game_id AND gl.lines_provider_id = 1004
        WHERE g.id = $1
        ORDER BY p.period, p.clock DESC
    `, [gameId]);

        for (let i = 0; i < plays.length; i++) {
            let play = plays[i];
            let playInputs = [
                parseInt(play.spread), // spread
                play.has_ball ? 1 : 0, // possession
                parseInt(play.home_score), // home points
                parseInt(play.away_score), // opp_points
                parseInt(play.time_remaining), // seconds left
                parseInt(play.yard_line), // yards to goal
                parseInt(play.down), // down
                parseInt(play.distance) // distance
            ];
            play.output = wpNetwork.activate(renormalizeData(playInputs))[0] * 100;
        }

        let last = plays[plays.length - 1];
        last.time_remaining = 0;
        last.output = Math.round(last.output);

        return [
            ...plays,
            last
        ];
    }

    return {
        getPP,
        getWP
    }
}