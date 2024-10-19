const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const serverChannelSchema = new Schema({
    companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    serverNumber: {
        type: String,
        required: true
    },

});

module.exports = mongoose.model('ServerChannel', serverChannelSchema);
