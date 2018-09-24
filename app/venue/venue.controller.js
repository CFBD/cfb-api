module.exports = (db) => {
    return {
        
        /** 
         * @api {get} /venues Get venue information
         * @apiVersion 1.0.0
         * @apiName GetVenues
         * @apiGroup Venues
         * 
         * @apiSuccess {Object[]} venues List of venues
         * @apiSuccess {Number} venues.id Id
         * @apiSuccess {String} venues.name Name
         * @apiSuccess {Number} venues.capacity Venue capacity, if available
         * @apiSuccess {Boolean} venues.grass Flag for whether the venue uses natural grass
         * @apiSuccess {String} venues.city City
         * @apiSuccess {String} venues.state State
         * @apiSuccess {String} venues.zip ZIP code
         * @apiSuccess {String} venues.country_code Country
         * @apiSuccess {Object} venues.location Location coordinates
         * @apiSuccess {Number} venues.location.x Latitude
         * @apiSuccess {Number} venues.location.y Longitude
         * @apiSuccess {Number} venues.elevation Elevation, if available
         * @apiSuccess {Number} venues.year Year of construction, if available
         * @apiSuccess {Boolean} venues.dome Flag for whether the venue is a dome
         * 
         */
        getVenues: async (req, res) => {
            try {
                let venues = await db.any(`
                    SELECT id, name, capacity, grass, city, state, zip, country_code, location, elevation, year_constructed, dome
                    FROM venue
                    ORDER BY name
                `);

                res.send(venues);
            } catch (err) {
                console.error(err);
                res.status(500).send({
                    error: 'Something went wrong.'
                });
            }
        }
    }
}