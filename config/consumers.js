module.exports = async () => {
    const rabbit = await require('./rabbit')();
    const channel = rabbit.channel;
    const createQueue = async (exchangeName, action) => {
        channel.assertExchange(exchangeName, 'fanout');

        const q = await channel.assertQueue('', {
            exclusive: true
        });

        channel.bindQueue(q.queue, exchangeName, '');

        channel.consume(q.queue, (message) => {
            if (message.content) {
                action(JSON.parse(message.content.toString()));
            }
        }, {
            noAck: true
        });
    };

    return {
        createQueue
    }
};