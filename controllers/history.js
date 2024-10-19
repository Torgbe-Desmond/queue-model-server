// controllers/historyController.js
const { StatusCodes } = require('http-status-codes');
const ScanHistory = require('../models/history');
const { default: mongoose } = require('mongoose');
const Customer = require('../models/customer');
const { connectionManager } = require('../socket/socket')


// Get all scan histories
const getAllScanHistories = async (req, res) => {
  try {
    const { id } = req.params;
    const scanHistories = await ScanHistory.find({id});
    console.log('scanHistories',scanHistories)
    res.status(StatusCodes.OK).json(scanHistories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Create a new scan history
const createScanHistory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { company, address, startTime, endTime, server, phone, userId } = req.body;
  
  try {
    const newScanHistory = await ScanHistory.create([{
      company,
      address,
      startTime,
      endTime,
      phone,
      server,
      userId
    }], { session });

    const userDetails = await Customer.findById(userId).session(session); // Use the session here
    if (!userDetails) {
      throw new Error('User not found');
    }

    userDetails.history.push(newScanHistory[0]._id);
    await userDetails.save({ session }); // Save user history in session

    await session.commitTransaction();
    res.status(StatusCodes.CREATED).json(newScanHistory[0]);
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating scan history:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create scan history' });
  } finally {
    session.endSession();
  }
};

module.exports = {
    createScanHistory,
    getAllScanHistories,
}