    const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const companySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    customerId:{
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    serverChannels: [{
        type: Schema.Types.ObjectId,
        ref: 'ServerChannel'
    }],
    password: {
        type: String,
        required: true
    }
});

const Company = mongoose.model('Company', companySchema);
module.exports = Company;
