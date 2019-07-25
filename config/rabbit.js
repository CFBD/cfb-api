module.exports = async () => {
    const amqp = require('amqplib');
    const url = process.env.RABBIT_URL;
    const vHost = process.env.RABBIT_VIRTUAL_HOST;
    const user = process.env.RABBIT_USER;
    const password = process.env.RABBIT_PASSWORD;

    const connection = await amqp.connect(`amqp://${user}:${password}@${url}/${vHost}`);
    const channel = await connection.createChannel();

    const publish = async (eventType, message) => {
        await channel.assertExchange(eventType, 'fanout');
        channel.publish(eventType, '', Buffer.from(JSON.stringify(message)));
    };

    return {
        channel,
        publish
    };
};