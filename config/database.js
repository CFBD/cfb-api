module.exports = () => {
    const {
        Model
    } = require('objection');
    const Knex = require('knex');

    const user = process.env.DATABASE_USER;
    const password = process.env.DATABASE_PASSWORD;
    const host = process.env.HOST;
    const port = process.env.DATABASE_PORT;
    const dbName = process.env.DATABASE;

    const connectionString = `postgres://${user}:${password}@${host}:${port}/${dbName}`;

    const knex = Knex({
        client: 'pg',
        useNullAsDefault: true,
        connection: connectionString
    });

    Model.knex(knex);

    class Athlete extends Model {
        static get tableName() {
            return 'athlete';
        }

        static get relationMappings() {
            return {
                team: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Team,
                    join: {
                        from: 'athlete.team_id',
                        to: 'team.id'
                    }
                },
                hometown: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Hometown,
                    join: {
                        from: 'athlete.hometown_id',
                        to: 'hometown.id'
                    }
                },
                position: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Position,
                    join: {
                        from: 'athlete.position_id',
                        to: 'position.id'
                    }
                },
                stats: {
                    relation: Model.HasManyRelation,
                    modelClass: GamePlayerStat,
                    join: {
                        from: 'athlete.id',
                        to: 'game_player_stat.athlete_id'
                    }
                }
            };
        }
    }

    class Coach extends Model {
        static get tableName() {
            return 'coach';
        }

        static get relationMappings() {
            return {
                seasons: {
                    relation: Model.HasManyRelation,
                    modelClass: CoachSeason,
                    join: {
                        from: 'coach.id',
                        to: 'coach_season.coach_id'
                    }
                }
            };
        }
    }



    class CoachSeason extends Model {
        static get tableName() {
            return 'coach_season';
        }

        static get relationMappings() {
            return {
                coach: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Coach,
                    join: {
                        from: 'coach_season.coach_id',
                        to: 'coach.id'
                    }
                },
                team: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Team,
                    join: {
                        from: 'coach_season.team_id',
                        to: 'team.id'
                    }
                }
            };
        }
    }

    class Conference extends Model {
        static get tableName() {
            return 'conference';
        }

        static get relationMappings() {
            return {
                teams: {
                    relation: Model.HasManyRelation,
                    modelClass: Team,
                    join: {
                        from: 'conference.id',
                        through: {
                            from: 'conference_team.conference_id',
                            to: 'conference_team.team_id'
                        },
                        to: 'team.id'
                    }
                }
            };
        }
    }

    class Drive extends Model {
        static get tableName() {
            return 'drive';
        }

        static get relationMappings() {
            return {
                game: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Game,
                    join: {
                        from: 'drive.game_id',
                        to: 'game.id'
                    }
                },
                offense: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Team,
                    join: {
                        from: 'drive.offense_id',
                        to: 'team.id'
                    }
                },
                defense: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Team,
                    join: {
                        from: 'drive.defense_9d',
                        to: 'team.id'
                    }
                },
                result: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: DriveResult,
                    join: {
                        from: 'drive.result_id',
                        to: 'drive_result.id'
                    }
                },
                plays: {
                    relation: Model.HasManyRelation,
                    modelClass: Play,
                    join: {
                        from: 'drive.id',
                        to: 'play.play_id'
                    }
                }
            };
        }
    }

    class DriveResult extends Model {
        static get tableName() {
            return 'drive_result';
        }
    }

    class Game extends Model {
        static get tableName() {
            return 'game';
        }

        static get relationMappings() {
            return {
                venue: {
                    relation: Model.HasOneRelation,
                    modelClass: Venue,
                    join: {
                        from: 'game.venue_id',
                        to: 'venue.id'
                    }
                },
                drives: {
                    relation: Model.HasManyRelation,
                    modelClass: Drive,
                    join: {
                        from: 'game.id',
                        to: 'drive.game_id'
                    }
                },
                teams: {
                    relation: Model.HasManyRelation,
                    modelClass: GameTeam,
                    join: {
                        from: 'game.id',
                        to: 'game_team.game_id'
                    }
                }
            };
        }
    }

    class GamePlayerStat extends Model {
        static get tableName() {
            return 'game_player_stat';
        }

        static get relationMappings() {
            return {
                type: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: PlayerStatType,
                    join: {
                        from: 'game_player_stat.type_id',
                        to: 'player_stat_type.id'
                    }
                },
                category: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: PlayerStatCategory,
                    join: {
                        from: 'game_player_stat.category_id',
                        to: 'player_stat_category.id'
                    }
                },
                athlete: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Athlete,
                    join: {
                        from: 'game_player_stat.athlete_id',
                        to: 'athlete.id'
                    }
                },
                game: {
                    relation: Model.HasOneThroughRelation,
                    modelClass: Game,
                    join: {
                        from: 'game_player_stat.game_team_id',
                        through: {
                            from: 'game_team.id',
                            to: 'game_team.game_id'
                        },
                        to: 'game.id'
                    }
                },
                team: {
                    relation: Model.HasOneThroughRelation,
                    modelClass: Team,
                    join: {
                        from: 'game_player_stat.game_team_id',
                        through: {
                            from: 'game_team.id',
                            to: 'game_team.team_id'
                        },
                        to: 'team.id'
                    }
                }
            }
        }
    }

    class GameTeam extends Model {
        static get tableName() {
            return 'game_team';
        }

        static get relationMappings() {
            return {
                game: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Game,
                    join: {
                        from: 'game_team.game_id',
                        to: 'game.id'
                    }
                },
                team: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Team,
                    join: {
                        from: 'game_team.team_id',
                        to: 'team.id'
                    }
                }
            };
        }
    }

    class GameTeamStat extends Model {
        static get tableName() {
            return 'game_team_stat';
        }

        static get relationMappings() {
            return {
                type: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: TeamStatType,
                    join: {
                        from: 'game_team_stat.type_id',
                        to: 'team_stat_type.id'
                    }
                },
                game: {
                    relation: Model.HasOneThroughRelation,
                    model: Game,
                    join: {
                        from: 'game_team_stat.game_team_id',
                        through: {
                            from: 'game_team.id',
                            to: 'game_team.game_id'
                        },
                        to: 'game.id'
                    }
                },
                team: {
                    relation: Model.HasOneThroughRelation,
                    model: Team,
                    join: {
                        from: 'game_team_stat.game_team_id',
                        through: {
                            from: 'game_team.id',
                            to: 'game_team.team_id'
                        },
                        to: 'team.id'
                    }
                }
            };
        }
    }

    class Hometown extends Model {
        static get tableName() {
            return 'hometown';
        }

        static get relationMappings() {
            return {
                athletes: {
                    relation: Model.HasManyRelation,
                    modelClass: Athlete,
                    join: {
                        from: 'hometown.id',
                        to: 'athlete.hometown_id'
                    }
                }
            };
        }
    }

    class Play extends Model {
        static get tableName() {
            return 'play';
        }

        static get relationMappings() {
            return {
                drive: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Drive,
                    join: {
                        from: 'play.drive_id',
                        to: 'drive.id'
                    }
                },
                offense: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Team,
                    join: {
                        from: 'play.offense_id',
                        to: 'team.id'
                    }
                },
                defense: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Team,
                    join: {
                        from: 'play.defense_id',
                        to: 'team.id'
                    }
                },
                type: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: PlayType,
                    join: {
                        from: 'play.play_type_id',
                        to: 'play_type.id'
                    }
                }
            };
        }
    }

    class PlayStat extends Model {
        static get tableName() {
            return 'play_stat';
        }

        static get relationMappings() {
            return {

            };
        }
    }

    class PlayStatType extends Model {
        static get tableName() {
            return 'play_stat_type';
        }

        static get relationMappings() {
            return {

            };
        }
    }

    class PlayType extends Model {
        static get tableName() {
            return 'play_type';
        }

        static get relationMappings() {
            return {

            };
        }
    }

    class PlayStatCategory extends Model {
        static get tableName() {
            return 'play_stat_category';
        }

        static get relationMappings() {
            return {

            };
        }
    }

    class PlayerStatCategory extends Model {
        static get tableName() {
            return 'player_stat_category';
        }
    }

    class PlayerStatType extends Model {
        static get tableName() {
            return 'player_stat_type'
        }
    }

    class Position extends Model {
        static get tableName() {
            return 'position';
        }
    }

    class Team extends Model {
        static get tableName() {
            return 'team';
        }

        static get relationMappings() {
            return {
                athletes: {
                    relation: Model.HasManyRelation,
                    modelClass: Athlete,
                    join: {
                        from: 'team.id',
                        to: 'athlete.team_id'
                    }
                },
                seasons: {
                    relation: Model.HasManyRelation,
                    modelClass: CoachSeason,
                    join: {
                        from: 'team.id',
                        to: 'coach_season.team_id'
                    }
                },
                conference: {
                    relation: Model.HasOneThroughRelation,
                    modelClass: Conference,
                    join: {
                        from: 'team.id',
                        through: {
                            from: 'conference_team.team_id',
                            to: 'conference_team.conference_id'
                        },
                        to: 'conference.id'
                    }
                },
                offensiveDrives: {
                    relation: Model.HasManyRelation,
                    modelClass: Drive,
                    join: {
                        from: 'team.id',
                        to: 'drive.offense_id'
                    }
                },
                defensiveDrives: {
                    relation: Model.HasManyRelation,
                    modelClass: Drive,
                    join: {
                        from: 'team.id',
                        to: 'drive.defense_id'
                    }
                },
                games: {
                    relation: Model.HasManyRelation,
                    modelClass: GameTeam,
                    join: {
                        from: 'team.id',
                        to: 'game_team.team_id'
                    }
                },
                offensivePlays: {
                    relation: Model.HasManyRelation,
                    modelClass: Play,
                    join: {
                        from: 'team.id',
                        to: 'play.offense_id'
                    }
                },
                defensivePlays: {
                    relation: Model.HasManyRelation,
                    modelClass: Play,
                    join: {
                        from: 'team.id',
                        to: 'play.defense_id'
                    }
                },
                talents: {
                    relation: Model.HasManyRelation,
                    modelClass: TeamTalent,
                    join: {
                        from: 'team.id',
                        to: 'team_talent.team_id'
                    }
                }
            };
        }
    }

    class TeamStatType extends Model {
        static get tableName() {
            return 'team_stat_type';
        }

        static get relationMappings() {
            return {

            };
        }
    }

    class TeamTalent extends Model {
        static get tableName() {
            return 'team_talent';
        }

        static get relationMappings() {
            return {
                team: {
                    relation: Model.BelongsToOneRelation,
                    modelClass: Team,
                    join: {
                        from: 'team_talent.team_id',
                        to: 'team.id'
                    }
                }
            };
        }
    }

    class Venue extends Model {
        static get tableName() {
            return 'venue';
        }

        static get relationMappings() {
            return {
                games: {
                    relation: Model.HasManyRelation,
                    modelClass: Game,
                    join: {
                        from: 'venue.id',
                        to: 'game.venue_id'
                    }
                }
            };
        }
    }

    return {
        Athlete,
        Coach,
        CoachSeason,
        Conference,
        Drive,
        DriveResult,
        Game,
        GamePlayerStat,
        GameTeam,
        GameTeamStat,
        Play,
        PlayStat,
        PlayStatCategory,
        PlayStatType,
        PlayType,
        TeamStatType,
        TeamTalent,
        Venue
    }
}