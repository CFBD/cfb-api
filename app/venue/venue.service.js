module.exports = (db) => {
    const getVenues = async () => {
        const venues = await db.any(`
                    SELECT id, name, capacity, grass, city, state, zip, country_code, location, elevation, year_constructed, dome, timezone
                    FROM venue
                    ORDER BY name
                `);

        return venues;
    };

    return {
        getVenues
    };
};
