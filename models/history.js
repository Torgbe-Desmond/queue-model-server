// models/ScanHistory.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ScanHistorySchema = new Schema({
  company: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  server: {
    type: String,
    required: true,
  },
});

const ScanHistory = mongoose.model('ScanHistory', ScanHistorySchema);
module.exports = ScanHistory;
