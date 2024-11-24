const { StatusCodes } = require('http-status-codes');
const ScanHistory = require('../models/history');
const { default: mongoose } = require('mongoose');
const Customer = require('../models/customer');
const { connectionManager } = require('../socket/socket');
const NotFound = require('../Errors/Notfound');

const getAllScanHistories = async (req, res) => {
  try {
    const { id } = req.params;
    const scanHistories = await ScanHistory.find({ id });
    res.status(StatusCodes.OK).json(scanHistories);
  } catch (error) {
    throw error;
  }
};

const createScanHistory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { company, address, startTime, endTime, server, phone, userId } = req.body;

  try {
    const newScanHistory = await ScanHistory.create(
      [{
        company,
        address,
        startTime,
        endTime,
        phone,
        server,
        userId,
      }],
      { session }
    );

    const userDetails = await Customer.findById(userId).session(session);
    if (!userDetails) {
      throw new NotFound('User not found');
    }

    userDetails.history.push(newScanHistory[0]._id);
    await userDetails.save({ session });

    await session.commitTransaction();
    res.status(StatusCodes.CREATED).json(newScanHistory[0]);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const deleteScanHistory = async (req, res) => {
  const { historyId } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const scanHistory = await ScanHistory.findByIdAndDelete(historyId, { session });
    if (!scanHistory) {
      throw new NotFound('Scan history not found');
    }

    const customer = await Customer.findById(scanHistory.userId).session(session);
    if (customer) {
      customer.history.pull(scanHistory._id);
      await customer.save({ session });
    }

    await session.commitTransaction();
    res.status(StatusCodes.OK).json({ _id: scanHistory._id });
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
  deleteScanHistory,
};
