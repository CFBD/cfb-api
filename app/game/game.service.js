module.exports = (db) => {
    const getDrives = async (year, seasonType, week, team, offense, defense, offenseConference, defenseConference, conference) => {
        let filter = 'WHERE g.season = $1';
        let params = [year];

        let index = 2;

        if (seasonType != 'both') {
            filter += ` AND g.season_type = $${index}`;
            params.push(seasonType || 'regular');
            index++;
        }

        if (week) {
            filter += ` AND g.week = $${index}`;
            params.push(week);
            index++;
        }

        if (team) {
            filter += ` AND (LOWER(offense.school) = LOWER($${index}) OR LOWER(defense.school) = LOWER($${index}))`;
            params.push(team);
            index++;
        }

        if (offense) {
            filter += ` AND LOWER(offense.school) = LOWER($${index})`;
            params.push(offense);
            index++;
        }

        if (defense) {
            filter += ` AND LOWER(defense.school) = LOWER($${index})`;
            params.push(defense);
            index++;
        }

        if (offenseConference) {
            filter += ` AND LOWER(oc.abbreviation) = LOWER($${index})`;
            params.push(offenseConference);
            index++;
        }

        if (defenseConference) {
            filter += ` AND LOWER(dc.abbreviation) = LOWER($${index})`;
            params.push(defenseConference);
            index++;
        }

        if (conference) {
            filter += ` AND (LOWER(oc.abbreviation) = LOWER($${index}) OR LOWER(dc.abbreviation) = LOWER($${index}))`;
            params.push(conference);
            index++;
        }

        let drives = await db.any(`
        WITH drives AS (
            SELECT  offense.school as offense,
                    oc.name as offense_conference,
                    defense.school as defense,
                    dc.name as defense_conference,
                    g.id as game_id,
                    d.id,
                    d.drive_number,
                    d.scoring,
                    d.start_period,
                    d.start_yardline,
                    CASE WHEN offense.id = hgt.team_id THEN (100 - d.start_yardline) ELSE d.start_yardline END AS start_yards_to_goal,
                    d.start_time,
                    d.end_period,
                    d.end_yardline,
                    CASE WHEN offense.id = hgt.team_id THEN (100 - d.end_yardline) ELSE d.end_yardline END AS end_yards_to_goal,
                    d.end_time,
                    d.elapsed,
                    d.plays,
                    d.yards,
                    dr.name as drive_result,
                    CASE WHEN offense.id = hgt.team_id THEN true ELSE false END AS is_home_offense
            FROM game g
                INNER JOIN game_team AS hgt ON g.id = hgt.game_id AND hgt.home_away = 'home'
                INNER JOIN drive d ON g.id = d.game_id
                INNER JOIN team offense ON d.offense_id = offense.id
                LEFT JOIN conference_team oct ON offense.id = oct.team_id AND oct.start_year <= g.season AND (oct.end_year >= g.season OR oct.end_year IS NULL)
                LEFT JOIN conference oc ON oct.conference_id = oc.id
                INNER JOIN team defense ON d.defense_id = defense.id
                LEFT JOIN conference_team dct ON defense.id = dct.team_id AND dct.start_year <= g.season AND (dct.end_year >= g.season OR dct.end_year IS NULL)
                LEFT JOIN conference dc ON dct.conference_id = dc.id
                INNER JOIN drive_result dr ON d.result_id = dr.id
            ${filter}
            ORDER BY g.id, d.drive_number
        ), points AS (
            SELECT d.id, MIN(p.home_score) AS starting_home_score, MIN(p.away_score) AS starting_away_score, MAX(p.home_score) AS ending_home_score, MAX(p.away_score) AS ending_away_score
            FROM drives AS d
                INNER JOIN play AS p ON d.id = p.drive_id
            GROUP BY d.id
        )
        SELECT d.*,
                CASE WHEN d.is_home_offense THEN p.starting_home_score ELSE p.starting_away_score END AS start_offense_score,
                CASE WHEN d.is_home_offense THEN p.starting_away_score ELSE p.starting_home_score END AS start_defense_score,
                CASE WHEN d.is_home_offense THEN p.ending_home_score ELSE p.ending_away_score END AS end_offense_score,
                CASE WHEN d.is_home_offense THEN p.ending_away_score ELSE p.ending_home_score END AS end_defense_score
        FROM drives AS d
            INNER JOIN points AS p ON d.id = p.id
                        `, params);

        for (let drive of drives) {
            if (!drive.start_time.minutes) {
                drive.start_time.minutes = 0;
            }

            if (!drive.start_time.seconds) {
                drive.start_time.seconds = 0;
            }

            if (!drive.end_time.minutes) {
                drive.end_time.minutes = 0;
            }

            if (!drive.end_time.seconds) {
                drive.end_time.seconds = 0;
            }
            
            if (!drive.elapsed.minutes) {
                drive.elapsed.minutes = 0;
            }

            if (!drive.elapsed.seconds) {
                drive.elapsed.seconds = 0;
            }
        }

        return drives;
    }

    const getMedia = async (year, seasonType, week, team, conference, mediaType) => {
        const filters = [];
        const params = [];
        let index = 1;

        if (year) {
            filters.push(`g.season = $${index}`);
            params.push(year);
            index++;
        }

        if (seasonType && seasonType.toLowerCase() !== 'both') {
            filters.push(`g.season_type = '${seasonType}'`);
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
            SELECT g.id, g.season, g.week, g.season_type, g.start_date, g.start_time_tbd, home.school AS home_school, hc.name AS home_conference, away.school AS away_school, ac.name AS away_conference, gm.media_type, gm.name AS outlet
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
            startTime: r.start_date,
            isStartTimeTBD: r.start_time_tbd,
            homeTeam: r.home_school,
            homeConference: r.home_conference,
            awayTeam: r.away_school,
            awayConference: r.away_conference,
            mediaType: r.media_type,
            outlet: r.outlet
        }));
    };

    const getCalendar = async (year) => {
        const weeks = await db.any(`
            SELECT g.week, g.season_type, MIN(g.start_date) AS first_game_start, MAX(g.start_date) AS last_game_start
            FROM game AS g
            WHERE g.season = $1
            GROUP BY g.week, g.season_type
            ORDER BY g.season_type, g.week
        `, [year]);

        return weeks.map(w => ({
            season: year,
            week: w.week,
            seasonType: w.season_type,
            firstGameStart: w.first_game_start,
            lastGameStart: w.last_game_start
        }));
    };

    const getWeather = async (year, seasonType, week, team, conference) => {
        const filters = [];
        const params = [];
        let index = 1;

        if (year) {
            filters.push(`g.season = $${index}`);
            params.push(year);
            index++;
        }

        if (seasonType && seasonType.toLowerCase() !== 'both') {
            filters.push(`g.season_type = '${seasonType}'`);
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

        const filter = 'WHERE ' + filters.join(' AND ');

        const results = await db.any(`
            SELECT g.id, g.season, g.week, g.season_type, g.start_date, home.school AS home_school, hc.name AS home_conference, away.school AS away_school, ac.name AS away_conference, v.id AS venue_id, v.name AS venue, w.temperature, w.dewpoint, w.humidity, w.precipitation, w.snowfall, w.wind_direction, w.wind_speed, w.pressure, w.weather_condition_code
            FROM game AS g
                INNER JOIN venue AS v ON g.venue_id = v.id
                INNER JOIN game_weather AS w ON g.id = w.game_id
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

        return results.map(r => ({
            id: parseInt(r.id),
            season: parseInt(r.season),
            week: parseInt(r.week),
            seasonType: r.season_type,
            startTime: r.start_date,
            homeTeam: r.home_school,
            homeConference: r.home_conference,
            awayTeam: r.away_school,
            awayConference: r.away_conference,
            venueId: parseInt(r.venue_id),
            venue: r.venue,
            temperature: r.temperature ? parseFloat(r.temperature) : null,
            dewPoint: r.dew_point ? parseFloat(r.dew_point) : null,
            humidity: r.humidity ? parseFloat(r.humidity) : null,
            precipitation: parseFloat(r.precipitation),
            snowfall: parseFloat(r.snowfall),
            windDirection: r.wind_direction ? parseFloat(r.wind_direction) : null,
            windSpeed: r.wind_speed ? parseFloat(r.wind_speed) : null,
            pressure: r.pressure ? parseFloat(r.pressure) : null,
            weatherConditionCode: r.weather_condition_code ? parseInt(r.weather_condition_code) : null
        }));
    };

    return {
        getDrives,
        getMedia,
        getCalendar,
        getWeather
    };
};