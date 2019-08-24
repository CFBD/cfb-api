module.exports = (db) => {
    const getSP = async (year, team) => {
        let filter = 'WHERE';
        let index = 1;
        let params = [];
        if (year) {
            filter += ` r.year = $${index}`;
            params.push(year);
            index++;
        }

        if (team) {
            filter += `${params.length ? ' AND' : ''} LOWER(t.school) = LOWER($${index})`;
            params.push(team);
        }

        const ratings = await db.any(`
            SELECT t.school, r.*
            FROM ratings AS r
                INNER JOIN team AS t ON r.team_id = t.id
            ${filter}
            ORDER BY r.year, r.rating DESC
        `, params);

        const averages = await db.any(`
            SELECT 	year,
                    AVG(rating) AS rating,
                    AVG(o_rating) AS o_rating,
                    AVG(d_rating) AS d_rating,
                    AVG(st_rating) AS st_rating,
                    AVG(sos) AS sos,
                    AVG(second_order_wins) AS second_order_wins,
                    AVG(o_success) AS o_success,
                    AVG(o_explosiveness) AS o_explosiveness,
                    AVG(o_rushing) AS o_rushing,
                    AVG(o_passing) AS o_passing,
                    AVG(o_standard_downs) AS o_standard_downs,
                    AVG(o_passing_downs) AS o_passing_downs,
                    AVG(o_run_rate) AS o_run_rate,
                    AVG(o_pace) AS o_pace,
                    AVG(d_success) AS o_success,
                    AVG(d_explosiveness) AS d_explosiveness,
                    AVG(d_rushing) AS d_rushing,
                    AVG(d_passing) AS d_passing,
                    AVG(d_standard_downs) AS d_standard_downs,
                    AVG(d_passing_downs) AS d_passing_downs,
                    AVG(d_havoc) AS d_havoc,
                    AVG(d_front_seven_havoc) AS d_front_seven_havoc,
                    AVG(d_db_havoc) AS d_db_havoc
            FROM ratings
            ${year ? 'WHERE year = $1' : ''}
            GROUP BY year
            ORDER BY year
        `, year ? [year] : []);

        ratings.push(...averages.map(a => ({
            school: 'nationalAverages',
            ...a
        })));

        return ratings.map(r => ({
            year: r.year,
            team: r.school,
            rating: parseFloat(r.rating),
            secondOrderWins: parseFloat(r.second_order_wins),
            sos: parseFloat(r.sos),
            offense: {
                rating: parseFloat(r.o_rating),
                success: parseFloat(r.o_success),
                explosiveness: parseFloat(r.o_explosiveness),
                rushing: parseFloat(r.o_rushing),
                passing: parseFloat(r.o_passing),
                standardDowns: parseFloat(r.o_standard_downs),
                passingDowns: parseFloat(r.o_passing_downs),
                runRate: parseFloat(r.o_run_rate),
                pace: parseFloat(r.o_pace)
            },
            defense: {
                rating: parseFloat(r.d_rating),
                success: parseFloat(r.d_success),
                explosiveness: parseFloat(r.d_explosiveness),
                rushing: parseFloat(r.d_rushing),
                passing: parseFloat(r.d_passing),
                standardDowns: parseFloat(r.d_standard_downs),
                passingDowns: parseFloat(r.d_passing_downs),
                havoc: {
                    total: parseFloat(r.d_havoc),
                    frontSeven: parseFloat(r.d_front_seven_havoc),
                    db: parseFloat(r.d_db_havoc)
                }
            },
            specialTeams: {
                rating: r.st_rating ? parseFloat(r.st_rating) : null
            }
        }));
    };

    return {
        getSP
    };
};
