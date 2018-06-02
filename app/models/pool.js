var mongoose = require('mongoose');

module.exports = mongoose.model('Pool', {
    pool: {
        type: String,
        default: ''
    }
});