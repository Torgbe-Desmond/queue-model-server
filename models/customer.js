const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    customerName: {
        type: String,
        required: true
    },
    assignedServerChannel: [{
        type: Schema.Types.ObjectId,
        ref: 'ServerChannel',
        default:'none'
    }],
    customerNumber: {
        type: Number, 
        required: true
    },
});

module.exports = mongoose.model('User', userSchema);
