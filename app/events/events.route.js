module.exports = async (app, consumers, expressWs) => {

    app.ws('/events/games', (ws, req) => {
        ws.options = {
            team: req.query.team ? req.query.team.toLowerCase() : null,
            events: []
        };

        if (req.query.gameStarted !== false) {
            ws.options.events.push('game_started');
        }

        if (req.query.gameCompleted !== false) {
            ws.options.events.push('game_completed');
        }

        if (req.query.quarterStarted !== false) {
            ws.options.events.push('quarter_started');
        }

        if (req.query.halftimeStarted !== false) {
            ws.options.events.push('halftime_started');
        }

        if (req.query.scoreChanged !== false) {
            ws.options.events.push('score_changed');
        }
    });

    const gamesWs = expressWs.getWss('/events/games');
    const broadcastGameEvent = (eventType) => {
        return (info) => {
            gamesWs.clients.forEach((client) => {
                if (client.options && client.options.team) {
                    if (info.homeTeam.location.toLowerCase() !== client.options.team && info.awayTeam.location.toLowerCase() !== client.options.team) {
                        return;
                    }
                }

                if (client.options && !client.options.events.includes(eventType)) {
                    return;
                }

                client.send(JSON.stringify({
                    eventType,
                    info
                }, null, '\t'));
            });
        }
    };

    await consumers.createQueue('game_started', broadcastGameEvent('game_started'));
    await consumers.createQueue('game_completed', broadcastGameEvent('game_completed'));
    await consumers.createQueue('quarter_started', broadcastGameEvent('quarter_started'));
    await consumers.createQueue('halftime_started', broadcastGameEvent('halftime_started'));
    await consumers.createQueue('score_changed', broadcastGameEvent('score_changed'));
}