// controllers/historyController.js
const { StatusCodes } = require('http-status-codes');
const ScanHistory = require('../models/history');
const { default: mongoose } = require('mongoose');

// Get all scan histories
const getAllScanHistories = async (req, res) => {
  try {
    const scanHistories = await ScanHistory.find();
    res.status(StatusCodes.OK).json(scanHistories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Create a new scan history
const createScanHistory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { company, location, date, startTime, endTime, server } = req.body;
  try {
    const newScanHistory = await ScanHistory.create([{
        company,
        location,
        date,
        startTime,
        endTime,
        server,
      }],{session});
    
    await session.commitTransaction();
    res.status(StatusCodes.CREATED).json(newScanHistory[0]);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
    createScanHistory,
    getAllScanHistories,
}