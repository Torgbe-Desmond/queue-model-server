// models/ScanHistory.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ScanHistorySchema = new Schema({
  company: {
    type: String,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  address:{
    type:String,
    required:true,
  },
  phone:{
    type:String,
    required:true,
  },
  endTime: {
    type: String,
    required: true,
  },
  server: {
    type: String,
    required: true,
  },
  userId:{
    type: Schema.Types.ObjectId,
    required: true,
    ref:'User'
  },
},
{
  timestamps:true,
}
);

const ScanHistory = mongoose.model('ScanHistory', ScanHistorySchema);
module.exports = ScanHistory;
