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
            SELECT t.school, c.name AS conference, r.*
            FROM ratings AS r
                INNER JOIN team AS t ON r.team_id = t.id
                INNER JOIN conference_team AS ct ON ct.team_id = t.id AND ct.end_year IS NULL
                INNER JOIN conference AS c ON ct.conference_id = c.id
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
                    AVG(d_success) AS d_success,
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
            conference: r.conference,
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

    const getConferenceSP = async (year, conference) => {
        let filter = '';
        let index = 1;
        let params = [];
        if (year) {
            filter += `WHERE r.year = $${index}`;
            params.push(year);
            index++;
        }

        if (conference) {
            if (!year) {
                filter += 'WHERE';
            }
            filter += `${params.length ? ' AND' : ''} LOWER(c.abbreviation) = LOWER($${index})`;
            params.push(conference);
        }

        const ratings = await db.any(`
            SELECT 	year,
                    c.name AS conference,
                    AVG(r.rating) AS rating,
                    AVG(r.o_rating) AS o_rating,
                    AVG(r.d_rating) AS d_rating,
                    AVG(r.st_rating) AS st_rating,
                    AVG(r.sos) AS sos,
                    AVG(r.second_order_wins) AS second_order_wins,
                    AVG(r.o_success) AS o_success,
                    AVG(r.o_explosiveness) AS o_explosiveness,
                    AVG(r.o_rushing) AS o_rushing,
                    AVG(r.o_passing) AS o_passing,
                    AVG(r.o_standard_downs) AS o_standard_downs,
                    AVG(r.o_passing_downs) AS o_passing_downs,
                    AVG(r.o_run_rate) AS o_run_rate,
                    AVG(r.o_pace) AS o_pace,
                    AVG(r.d_success) AS d_success,
                    AVG(r.d_explosiveness) AS d_explosiveness,
                    AVG(r.d_rushing) AS d_rushing,
                    AVG(r.d_passing) AS d_passing,
                    AVG(r.d_standard_downs) AS d_standard_downs,
                    AVG(r.d_passing_downs) AS d_passing_downs,
                    AVG(r.d_havoc) AS d_havoc,
                    AVG(r.d_front_seven_havoc) AS d_front_seven_havoc,
                    AVG(r.d_db_havoc) AS d_db_havoc
            FROM ratings AS r
                INNER JOIN conference_team AS ct ON ct.team_id = r.team_id AND ct.start_year <= r.year AND (ct.end_year >= r.year OR ct.end_year IS NULL)
                INNER JOIN conference AS c ON ct.conference_id = c.id
            ${filter}
            GROUP BY year, c.name
            ORDER BY c.name, year
        `, params);

        return ratings.map(r => ({
            year: r.year,
            conference: r.conference,
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
    }

    const getSRS = async (year, team, conference) => {
        let filters = [];
        let params = [];
        let index = 1;

        if (year) {
            filters.push(`s.year = $${index}`);
            params.push(year);
            index++;
        }

        if (team) {
            filters.push(`LOWER(t.school) = LOWER($${index})`);
            params.push(team);
            index++
        }

        if (conference) {
            filters.push(`LOWER(c.abbreviation) = LOWER($${index})`);
            params.push(conference);
            index++;
        }

        filter = 'WHERE ' + filters.join(' AND ');

        const results = await db.any(`
            SELECT s.year, t.school AS team, c.name AS conference, ct.division, s.rating
            FROM srs AS s
                INNER JOIN team AS t ON s.team_id = t.id
                LEFT JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= s.year AND (ct.end_year >= s.year OR ct.end_year IS NULL)
                LEFT JOIN conference AS c ON ct.conference_id = c.id
            ${filter}
        `, params);

        return results;
    }

    return {
        getSP,
        getConferenceSP,
        getSRS
    };
};
