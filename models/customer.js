const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum:['male','female']
    },
    password: {
        type: String,
        required: true
    },
});

module.exports = mongoose.model('User', userSchema);
