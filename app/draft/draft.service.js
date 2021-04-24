module.exports = (db) => {
    const getTeams = async () => {
        let teams = await db.any(`SELECT * FROM draft_team ORDER BY location`);

        return teams.map(t => ({
            location: t.location,
            nickname: t.mascot,
            displayName: t.display_name,
            logo: t.logo
        }));
    };

    const getPositions = async () => {
        let positions = await db.any(`SELECT DISTINCT name, abbreviation FROM draft_position ORDER BY name`);
        
        return positions;
    };

    const getPicks = async (year, team, school, conference, position) => {
        const filters = [];
        const params = [];
        let index = 1;

        if (year) {
            filters.push(`dp.year = $${index}`);
            params.push(year);
            index++;
        }

        if (team) {
            filters.push(`LOWER(dt.location) = LOWER($${index})`);
            params.push(team);
            index++;
        }

        if (school) {
            filters.push(`LOWER(ct.school) = LOWER($${index})`);
            params.push(school);
            index++;
        }

        if (conference) {
            filters.push(`LOWER(c.abbreviation) = LOWER($${index})`);
            params.push(conference);
            index++;
        }

        if (position) {
            filters.push(`(LOWER(pos.name) = LOWER($${index}) OR LOWER(pos.abbreviation) = LOWER($${index}))`);
            params.push(position);
            index++;
        }

        const filter = filters.length ? 'WHERE ' + filters.join(' AND ') : '';

        let picks = await db.any(`
        SELECT 	dp.college_id AS college_athlete_id,
                dp.id AS nfl_athlete_id,
                ct.id AS college_id,
                ct.school AS college_team,
                c.name AS conference,
                dt.location AS nfl_team,
                dp.year,
                dp.overall,
                dp.round,
                dp.pick,
                dp.name,
                pos.name AS "position",
                dp.height,
                dp.weight,
                dp.overall_rank,
                dp.position_rank,
                dp.grade,
                h.city,
                h.state,
                h.country,
                h.latitude,
                h.longitude,
                h.county_fips
        FROM draft_picks AS dp
            INNER JOIN draft_team AS dt ON dp.nfl_team_id = dt.id
            INNER JOIN draft_position AS pos ON dp.position_id = pos.id
            INNER JOIN team AS ct ON dp.college_team_id = ct.id
            LEFT JOIN conference_team AS cot ON ct.id = cot.team_id AND (dp.year - 1) >= cot.start_year AND (cot.end_year IS NULL OR (dp.year - 1) <= cot.end_year)
            LEFT JOIN conference AS c ON cot.conference_id = c.id
            LEFT JOIN athlete AS a ON dp.college_id = a.id
            LEFT JOIN hometown AS h ON a.hometown_id = h.id
        ${filter}
        ORDER BY overall
        `, params);

        return picks.map(p => ({
            collegeAthleteId: p.college_athlete_id,
            nflAthleteId: p.nfl_athlete_id,
            collegeId: p.college_id,
            collegeTeam: p.college_team,
            collegeConference: p.conference,
            nflTeamId: p.nfl_team_id,
            nflTeam: p.nfl_team,
            year: p.year,
            overall: p.overall,
            round: p.round,
            pick: p.pick,
            name: p.name,
            position: p.position,
            height: p.height,
            weight: p.weight,
            preDraftRanking: p.overall_rank,
            preDraftPositionRanking: p.position_rank,
            preDraftGrade: p.grade,
            hometownInfo: {
                city: p.city,
                state: p.state,
                country: p.country,
                latitude: p.latitude,
                longitude: p.longitude,
                countyFips: p.county_fips
            }
        }));
    };

    return {
        getTeams,
        getPicks,
        getPositions
    };
};
