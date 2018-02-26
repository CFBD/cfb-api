module.exports = (coaches) => {
    return {
        runTest: (req, res) => {
            res.send({
                success: true,
                message: 'Let\'s do this',
                name: req.query.name
            });
        },
        getData: async (req, res) => {
            const result = await coaches
                .query()
                .where('last_name', '=', 'Harbaugh')
                .eager('seasons');
            res.send(result);
        }
    }
}