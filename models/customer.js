const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    image:{
        type: String,
        ref:'File'
    },
    email: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum:['male','female']
    },
    history: [{
        type: Schema.Types.ObjectId,
        ref: 'ScanHistory'
    }],
    password: {
        type: String,
        required: true
    },
});

module.exports = mongoose.model('User', userSchema);
