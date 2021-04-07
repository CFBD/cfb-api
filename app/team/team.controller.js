module.exports = (db, Sentry) => {
    return {
        getTeams: async (req, res) => {
            try {
                let filter = req.query.conference ? 'WHERE LOWER(c.abbreviation) = LOWER($1)' : '';
                let params = [req.query.conference];

                let teams = await db.any(`
                    SELECT t.id, t.school, t.mascot, t.abbreviation, t.alt_name as alt_name1, t.abbreviation as alt_name2, t.nickname as alt_name3, c.name as conference, ct.division as division, ('#' || t.color) as color, ('#' || t.alt_color) as alt_color, t.images as logos
                    FROM team t
                        LEFT JOIN conference_team ct ON t.id = ct.team_id AND ct.end_year IS NULL
                        LEFT JOIN  conference c ON c.id = ct.conference_id
                    ${filter}
                    ORDER BY t.active DESC, t.school
                `, params);

                res.send(teams);
            } catch (err) {
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getFBSTeams: async (req, res) => {
            try {
                if (req.query.year && !parseInt(req.query.year)) {
                    res.status(400).send('Year must be numeric');
                    return;
                }

                let filter = req.query.year ? 'WHERE ct.start_year <= $1 AND (ct.end_year >= $1 OR ct.end_year IS NULL)' : 'WHERE ct.end_year IS NULL';
                let params = req.query.year ? [req.query.year] : [];

                let teams = await db.any(`
                    SELECT t.id, t.school, t.mascot, t.abbreviation, t.alt_name as alt_name1, t.abbreviation as alt_name2, t.nickname as alt_name3, c.name as conference, ct.division as division, ('#' || t.color) as color, ('#' || t.alt_color) as alt_color, t.images as logos
                    FROM team t
                        INNER JOIN conference_team ct ON t.id = ct.team_id
                        INNER JOIN  conference c ON c.id = ct.conference_id
                    ${filter}
                    ORDER BY t.active DESC, t.school
                `, params);

                res.send(teams);
            } catch (err) {
                Sentry.captureException(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getRoster: async (req, res) => {
            try {
                let filters = [];
                let params = [];
                let index = 1;

                if (req.query.team) {
                    filters.push(`LOWER(t.school) = LOWER($${index})`)
                    params.push(req.query.team);
                    index++;
                }

                if (req.query.year) {
                    if (!parseInt(req.query.year)) {
                        res.status(400).send({
                            error: 'year must be numeric.'
                        });
                        return;
                    }
                }

                let year = req.query.year || 2020;
                filters.push(`att.start_year <= $${index} AND att.end_year >= $${index}`);
                params.push(year);

                let filter = `WHERE ${filters.join(' AND ')}`;

                let roster = await db.any(`
                    SELECT a.id, a.first_name, a.last_name, t.school AS team, a.weight, a.height, a.jersey, a.year, p.abbreviation as position, h.city as home_city, h.state as home_state, h.country as home_country, h.latitude as home_latitude, h.longitude as home_longitude, h.county_fips as home_county_fips
                    FROM team t
                        INNER JOIN athlete_team AS att ON t.id = att.team_id
                        INNER JOIN athlete a ON att.athlete_id = a.id
                        LEFT JOIN hometown h ON a.hometown_id = h.id
                        LEFT JOIN position p ON a.position_id = p.id
                    ${filter}
                `, params);

                res.send(roster);

            } catch (err) {
                Sentry.captureException(err);
                res.status(400).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getConferences: async (req, res) => {
            try {
                let conferences = await db.any(`
                    SELECT id, name, short_name, abbreviation
                    FROM conference
                    ORDER BY id
                `);

                res.send(conferences);
            } catch (err) {
                Sentry.captureException(err);
                res.status(400).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getTeamTalent: async (req, res) => {
            try {
                if (req.query.year && isNaN(req.query.year)) {
                    res.status(400).send({
                        error: 'Week parameter must be numeric'
                    });

                    return;
                }

                let filter = req.query.year ? 'WHERE tt.year = $1' : '';
                let params = req.query.year ? [req.query.year] : [];

                let talent = await db.any(`
                    SELECT tt.year, t.school, tt.talent
                    FROM team_talent tt
                        INNER JOIN team t ON tt.team_id = t.id
                    ${filter}
                    ORDER BY tt.year DESC, tt.talent DESC
                `, params);

                res.send(talent);
            } catch (err) {
                Sentry.captureException(err);
                res.status(400).send({
                    error: 'Something went wrong.'
                });
            }
        },
        getMatchup: async (req, res) => {
            try {
                if (!req.query.team1 || !req.query.team2) {
                    res.status(400).send({
                        error: 'Two teams must be specified.'
                    });
                    return;
                }

                let filter = `WHERE g.start_date < now() AND ((LOWER(home_team.school) = LOWER($1) AND LOWER(away_team.school) = LOWER($2)) OR (LOWER(away_team.school) = LOWER($1) AND LOWER(home_team.school) = LOWER($2)))`;
                let params = [req.query.team1, req.query.team2];

                let index = 3;

                if (req.query.minYear) {
                    filter += ` AND g.season >= $${index}`;
                    params.push(req.query.minYear);
                    index++;
                }

                if (req.query.maxYear) {
                    filter += ` AND g.season <= $${index}`;
                    params.push(req.query.maxYear);
                    index++;
                }

                let results = await db.any(`
                    SELECT g.season, g.week, g.season_type, g.start_date, g.neutral_site, v.name as venue, home_team.school as home, home.points as home_points, away_team.school as away, away.points as away_points
                    FROM game g
                        INNER JOIN game_team home ON g.id = home.game_id AND home.home_away = 'home'
                        INNER JOIN team home_team ON home.team_id = home_team.id
                        INNER JOIN game_team away ON g.id = away.game_id AND away.home_away = 'away'
                        INNER JOIN team away_team ON away.team_id = away_team.id
                        LEFT JOIN venue v ON g.venue_id = v.id
                    ${filter}
                    ORDER BY g.season
                `, params);

                let games = results.map(r => {
                    let homePoints = r.home_points * 1.0;
                    let awayPoints = r.away_points * 1.0;

                    return {
                        season: r.season,
                        week: r.week,
                        seasonType: r.season_type,
                        date: r.start_date,
                        neutralSite: r.neutral_site,
                        venue: r.venue,
                        homeTeam: r.home,
                        homeScore: homePoints,
                        awayTeam: r.away,
                        awayScore: awayPoints,
                        winner: homePoints == awayPoints ? null : homePoints > awayPoints ? r.home : r.away
                    }
                });

                let teams = Array.from(new Set([...games.map(g => g.homeTeam), ...games.map(g => g.awayTeam)]));
                let team1 = teams.find(t => t.toLowerCase() == req.query.team1.toLowerCase());
                let team2 = teams.find(t => t.toLowerCase() == req.query.team2.toLowerCase());

                let data = {
                    team1,
                    team2,
                    startYear: req.query.minYear,
                    endYear: req.query.maxYear,
                    team1Wins: games.filter(g => g.winner == team1).length,
                    team2Wins: games.filter(g => g.winner == team2).length,
                    ties: games.filter(g => !g.winner).length,
                    games: games
                };

                res.send(data);
            } catch (err) {
                Sentry.captureException(err);
                res.status(400).send({
                    error: 'Something went wrong.'
                });
            }
        }
    }
}
