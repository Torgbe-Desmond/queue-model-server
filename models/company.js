const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const companySchema = new Schema({
    name: {
        type: String,
    },
    address: {
        type: String,
    },
    phone: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true
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
