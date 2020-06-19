module.exports = (db) => {
    const getMedia = async (year, seasonType, week, team, conference, mediaType) => {
        const filters = [];
        const params = [];
        let index = 1;

        if (year) {
            filters.push(`g.season = $${index}`);
            params.push(year);
            index++;
        }

        if (seasonType) {
            filters.push(`g.season_type = ${seasonType}`);
            params.push(seasonType);
            index++;
        }

        if (week) {
            filters.push(`g.week = $${index}`);
            params.push(week);
            index++
        }

        if (team) {
            filters.push(`(LOWER(home.school) = LOWER($${index}) OR LOWER(away.school) = LOWER($${index}))`);
            params.push(team);
            index++;
        }

        if (conference) {
            filters.push(`(LOWER(hc.abbreviation) = LOWER($${index}) OR LOWER(ac.abbreviation) = LOWER($${index}))`);
            params.push(conference);
            index++;
        }

        if (mediaType) {
            filters.push(`gm.media_type = $${index}`);
            params.push(mediaType.toLowerCase());
            index++;
        }

        const filter = 'WHERE ' + filters.join(' AND ');

        const results = await db.any(`
            SELECT g.id, g.season, g.week, g.season_type, home.school AS home_school, hc.name AS home_conference, away.school AS away_school, ac.name AS away_conference, gm.media_type, gm.name AS outlet
            FROM game AS g
                INNER JOIN game_media AS gm ON g.id = gm.game_id
                INNER JOIN game_team AS home_team ON g.id = home_team.game_id AND home_team.home_away = 'home'
                INNER JOIN team AS home ON home_team.team_id = home.id
                LEFT JOIN conference_team AS hct ON home.id = hct.team_id AND hct.start_year <= g.season AND (hct.end_year IS NULL OR hct.end_year >= g.season)
                LEFT JOIN conference AS hc ON hct.conference_id = hc.id
                INNER JOIN game_team AS away_team ON g.id = away_team.game_id AND away_team.home_away = 'away'
                INNER JOIN team AS away ON away_team.team_id = away.id
                LEFT JOIN conference_team AS act ON away.id = act.team_id AND act.start_year <= g.season AND (act.end_year IS NULL OR act.end_year >= g.season)
                LEFT JOIN conference AS ac ON act.conference_id = ac.id
            ${filter}
        `, params);

        return results.map((r) => ({
            id: r.id,
            season: r.season,
            week: r.week,
            seasonType: r.season_type,
            homeTeam: r.home_school,
            homeConference: r.home_conference,
            awayTeam: r.away_school,
            awayConference: r.away_conference,
            mediaType: r.media_type,
            outlet: r.outlet
        }));
    };

    return {
        getMedia
    };
};