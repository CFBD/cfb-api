module.exports = (db) => {

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

    return {
        getPP
    }
}