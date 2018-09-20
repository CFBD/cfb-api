module.exports = (coaches) => {
    return {
        // getList: async (req, res) => {
        //     const result = await coaches
        //         .query()
        //         .eagerAlgorithm(coaches.JoinEagerAlgorithm)
        //         .eager('[seasons.[team]]');
        //     res.send(result.map(r => {
        //         return {
        //             firstName: r.first_name,
        //             lastName: r.last_name,
        //             startYear: Math.min.apply(null, r.seasons.map(t => t.year)),
        //             endYear: Math.max.apply(null, r.seasons.map(t => t.year)),
        //             teams: [...new Set(r.seasons.map(s => s.team.school))]
        //         }
        //     }));
        // },
        // getCoach: async (req, res) => {

        //     const result = await coaches
        //         .query()
        //         .eagerAlgorithm(coaches.JoinEagerAlgorithm)
        //         .eager('[seasons.[team]]');
        //     res.send(result);
        // }
    }
}