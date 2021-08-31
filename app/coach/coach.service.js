module.exports = (db) => {
    const getCoaches = async (firstName, lastName, team, year, minYear, maxYear) => {
        let filter = '';
        let params = [];
        let index = 1;

        if (firstName) {
            filter += `${index == 1 ? 'WHERE' : ' AND'} LOWER(c.first_name) = LOWER($${index})`;
            params.push(firstName);
            index++;
        }

        if (lastName) {
            filter += `${index == 1 ? 'WHERE' : ' AND'} LOWER(c.last_name) = LOWER($${index})`;
            params.push(lastName);
            index++;
        }

        if (team) {
            filter += `${index == 1 ? 'WHERE' : ' AND'} LOWER(t.school) = LOWER($${index})`;
            params.push(team);
            index++;
        }

        if (year) {
            filter += `${index == 1 ? 'WHERE' : ' AND'} cs.year = $${index}`;
            params.push(year);
            index++;
        }

        if (minYear) {
            filter += `${index == 1 ? 'WHERE' : ' AND'} cs.year >= $${index}`;
            params.push(minYear);
            index++;
        }


        if (maxYear) {
            filter += `${index == 1 ? 'WHERE' : ' AND'} cs.year <= $${index}`;
            params.push(maxYear);
            index++;
        }

        let results = await db.any(`
        SELECT 	c.id,
                c.first_name,
                c.last_name,
                t.school,
                ct.hire_date,
                cs.year,
                cs.games,
                cs.wins,
                cs.losses,
                cs.ties,
                cs.preseason_rank,
                cs.postseason_rank,
                ROUND(srs.rating, 1) AS srs,
                r.rating AS sp,
                r.o_rating AS sp_offense,
                r.d_rating AS sp_defense
        FROM coach c
            INNER JOIN coach_season cs ON c.id = cs.coach_id
            INNER JOIN team t ON cs.team_id = t.id
            LEFT JOIN srs ON cs.year = srs.year AND t.id = srs.team_id
            LEFT JOIN ratings AS r ON r.year = srs.year AND r.team_id = srs.team_id
            LEFT JOIN coach_team AS ct ON ct.coach_id = c.id AND ct.team_id = t.id AND cs.year >= EXTRACT(year FROM ct.hire_date)
        ${filter}
        ORDER BY c.last_name, c.first_name, cs.year
        `, params);

        let coaches = [];
        let ids = Array.from(new Set(results.map(r => r.id)));
        for (let id of ids) {
            let coachSeasons = results.filter(r => r.id == id);

            coaches.push({
                first_name: coachSeasons[0].first_name,
                last_name: coachSeasons[0].last_name,
                hire_date: coachSeasons[0].hire_date,
                seasons: coachSeasons.map(cs => {
                    return {
                        school: cs.school,
                        year: cs.year,
                        games: cs.games,
                        wins: cs.wins,
                        losses: cs.losses,
                        ties: cs.ties,
                        preseason_rank: cs.preseason_rank,
                        postseason_rank: cs.postseason_rank,
                        srs: cs.srs,
                        sp_overall: cs.sp,
                        sp_offense: cs.sp_offense,
                        sp_defense: cs.sp_defense
                    }
                })
            });
        }

        return coaches;
    };

    return {
        getCoaches
    };
};
