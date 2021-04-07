module.exports = (db, Sentry) => {
    const getPlayers = async (req, res) => {
        try {
            if (!req.query.year && !req.query.team) {
                res.status(400).send({
                    error: 'A year or team filter must be specified.'
                });

                return;
            }

            if (req.query.year && isNaN(req.query.year)) {
                res.status(400).send({
                    error: 'Year parameter must be numeric.'
                });

                return;
            }

            let filter = 'WHERE r.recruit_type = $1';
            let params = [
                req.query.classification ? req.query.classification : 'HighSchool'
            ];

            let index = 2;

            if (req.query.year) {
                filter += ` AND r.year = $${index}`;
                params.push(req.query.year);
                index++;
            }

            if (req.query.position) {
                filter += ` AND LOWER(pos.position) = LOWER($${index})`;
                params.push(req.query.position);
                index++;
            }

            if (req.query.state) {
                filter += ` AND LOWER(h.state) = LOWER($${index})`;
                params.push(req.query.state);
                index++;
            }

            if (req.query.team) {
                filter += ` AND LOWER(t.school) = LOWER($${index})`;
                params.push(req.query.team);
                index++;
            }

            let recruits = await db.any(`
                SELECT r.recruit_type, r.year, r.ranking, r.name, rs.name AS school, pos.position, r.height, r.weight, r.stars, r.rating, t.school AS committed_to, h.city AS city, h.state AS state_province, h.country AS country, h.latitude, h.longitude, h.county_fips
                FROM recruit AS r
                    LEFT JOIN recruit_school AS rs ON r.recruit_school_id = rs.id
                    LEFT JOIN recruit_position AS pos ON r.recruit_position_id = pos.id
                    LEFT JOIN team AS t ON r.college_id = t.id
                    LEFT JOIN hometown AS h ON r.hometown_id = h.id
                ${filter}
                ORDER BY r.ranking
            `, params);

            res.send(recruits.map(r => ({
                recruitType: r.recruit_type,
                year: r.year,
                ranking: r.ranking,
                name: r.name,
                school: r.school,
                committedTo: r.committed_to,
                position: r.position,
                height: r.height,
                weight: r.weight,
                stars: r.stars,
                rating: r.rating,
                city: r.city,
                stateProvince: r.state_province,
                country: r.country,
                hometownInfo: {
                    latitude: r.latitude,
                    longitude: r.longitude,
                    fipsCode: r.county_fips
                }
            })));
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    }

    const getTeams = async (req, res) => {
        try {
            let filter = '';
            let params = [];
            let index = 1;

            if (req.query.year || req.query.team) {
                filter += 'WHERE';
                if (req.query.year)
                    if (!parseInt(req.query.year)) {
                        res.status(400).send({
                            error: 'Year must be numeric'
                        });
                        return;
                    } else {
                        filter += ` rt.year = $${index}`;
                        params.push(req.query.year);
                        index++;
                    }

                    if (req.query.team) {
                        if (params.length) {
                            filter += ' AND';
                        }
                        filter += ` LOWER(t.school) = LOWER($${index})`;
                        params.push(req.query.team);
                    }
            }

            let ranks = await db.any(`
                SELECT rt.year, rt.rank, t.school AS team, rt.points
                FROM recruiting_team AS rt
                    INNER JOIN team AS t ON rt.team_id = t.id
                ${filter}
                ORDER BY year, rank
            `, params);

            res.send(ranks);

        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong.'
            });
        }
    };

    const getAggregatedPlayers = async (req, res) => {
        try {
            if (req.query.startYear && !parseInt(req.query.startYear)) {
                res.status(400).send({
                    error: 'startYear must be a nubmer'
                });
            } else if (req.query.endYear && !parseInt(req.query.endYear)) {
                res.status(400).send({
                    error: 'endYear must be a number'
                });
            } else {
                let filter = `WHERE r.recruit_type = 'HighSchool' AND r.year <= $1 AND r.year >= $2`;
                let params = [
                                req.query.endYear ? req.query.endYear : new Date().getFullYear(),
                                req.query.startYear ? req.query.startYear : 2000
                            ];
                let index = 3;

                if (req.query.conference) {
                    filter += ` AND LOWER(c.abbreviation) = LOWER($${index})`;
                    params.push(req.query.conference);
                    index++;
                }

                if (req.query.team) {
                    filter += ` AND LOWER(t.school) = LOWER($${index})`;
                    params.push(req.query.team);
                    index++;
                }

                let results = await db.any(`
                    SELECT t.school, p.position_group, c.name as conference, AVG(r.rating) AS avg_rating, SUM(r.rating) AS total_rating, COUNT(r.id) AS total_commits, AVG(stars) AS avg_stars
                    FROM recruit_position AS p
                        INNER JOIN recruit AS r ON p.id = r.recruit_position_id
                        INNER JOIN team AS t ON r.college_id = t.id
                        INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= $1 AND (ct.end_year IS NULL OR ct.end_year >= $1)
                        INNER JOIN conference AS c ON ct.conference_id = c.id
                    ${filter}
                    GROUP BY t.school, p.position_group, c.name
                    ORDER BY t.school, p.position_group
                `, params);

                let totalResults = await db.any(`
                    SELECT t.school, 'All Positions' AS position_group, c.name as conference, AVG(r.rating) AS avg_rating, SUM(r.rating) AS total_rating, COUNT(r.id) AS total_commits, AVG(stars) AS avg_stars
                    FROM recruit_position AS p
                        INNER JOIN recruit AS r ON p.id = r.recruit_position_id
                        INNER JOIN team AS t ON r.college_id = t.id
                        INNER JOIN conference_team AS ct ON t.id = ct.team_id AND ct.start_year <= $1 AND (ct.end_year IS NULL OR ct.end_year >= $1)
                        INNER JOIN conference AS c ON ct.conference_id = c.id
                    ${filter}
                    GROUP BY t.school, c.name
                    ORDER BY t.school
                `, params);

                results = [
                    ...results,
                    ...totalResults
                ];

                res.send(results.map(r => ({
                    team: r.school,
                    conference: r.conference,
                    positionGroup: r.position_group,
                    averageRating: parseFloat(r.avg_rating),
                    totalRating: parseFloat(r.total_rating),
                    commits: parseInt(r.total_commits),
                    averageStars: parseFloat(r.avg_stars)
                })));
            }
        } catch (err) {
            Sentry.captureException(err);
            res.status(500).send({
                error: 'Something went wrong'
            });
        }
    }

    return {
        getPlayers,
        getTeams,
        getAggregatedPlayers
    };
};