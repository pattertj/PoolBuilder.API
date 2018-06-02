var poolbuilder = require('../models/pool');

module.exports = function (app, db) {
    app.post('/api/pool', (req, res) => {
        console.log(req.body)
        res.send('Hello')
    });
};