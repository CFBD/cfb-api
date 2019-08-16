module.exports = (db) => {
    const getPlayers = async (req, res) => {
        try {
            if (!req.query.year || isNaN(req.query.year)) {
                res.status(400).send({
                    error: 'A numeric year parameter must be specified.'
                });
    
                return;
            }
    
            let filter = 'WHERE r.recruit_type = $1 AND r.year = $2';
            let params = [
                req.query.classification ? req.query.classification : 'HighSchool',
                req.query.year
            ];
    
            let index = 3;
            
            if (req.query.position) {
                filter += ` AND LOWER(pos.position) = LOWER($${index})`;
                params.push(req.query.position);
                index++;
            }
    
            if (req.query.state) {
                filter += ` AND LOWER(st.name) = LOWER($${index})`;
                params.push(req.query.state);
                index++;
            }
    
            if (req.query.team) {
                filter += ` AND LOWER(t.school) = LOWER($${index})`;
                params.push(req.query.team);
                index++;
            }
    
            let recruits = await db.any(`
                SELECT r.recruit_type, r.year, r.ranking, r.name, rs.name AS school, pos.position, r.height, r.weight, r.stars, r.rating, t.school AS committed_to, c.name AS city, st.name AS state_province, co.name AS country 
                FROM recruit AS r
                    LEFT JOIN recruit_school AS rs ON r.recruit_school_id = rs.id
                    LEFT JOIN recruit_position AS pos ON r.recruit_position_id = pos.id
                    LEFT JOIN team AS t ON r.college_id = t.id
                    LEFT JOIN city AS c ON r.city_id = c.id
                    LEFT JOIN state_province AS st ON r.state_id = st.id
                    LEFT JOIN country AS co ON r.country_id = co.id
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
                country: r.country
            })));
        } catch (err) {
            console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
        }
    }

    return {
        getPlayers
    };
};
