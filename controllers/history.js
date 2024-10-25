// controllers/historyController.js
const { StatusCodes } = require('http-status-codes');
const ScanHistory = require('../models/history');
const { default: mongoose } = require('mongoose');
const Customer = require('../models/customer');
const { connectionManager } = require('../socket/socket');
const NotFound = require('../Errors/Notfound');


// Get all scan histories
const getAllScanHistories = async (req, res) => {
  try {
    const { id } = req.params;
    const scanHistories = await ScanHistory.find({id});
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
      throw new NotFound('User not found');
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


// Delete a scan history
const deleteScanHistory = async (req, res) => {
  const { historyId } = req.params; // The ID of the scan history to delete
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find and delete the scan history
    const scanHistory = await ScanHistory.findByIdAndDelete(historyId, { session });
    if (!scanHistory) {
      throw new NotFound('Scan history not found');
    }

    // Find the associated customer and remove the scan history ID from their history array
    const customer = await Customer.findById(scanHistory.userId).session(session);
    if (customer) {
      customer.history.pull(scanHistory._id);
      await customer.save({ session });
    }

    await session.commitTransaction();
    res.status(StatusCodes.OK).json({ _id:scanHistory._id });
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
    deleteScanHistory
}