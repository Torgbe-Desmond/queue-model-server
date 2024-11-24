const ServerChannel = require('../models/server');
const Company = require('../models/company');
const mongoose = require('mongoose');
const { generateRandomString } = require('../utils/generateRandomString');
const BadRequest = require('../Errors/BadRequest');
const NotFound = require('../Errors/Notfound');
const { StatusCodes } = require('http-status-codes');


const loginServer = async (req, res) => {
  const { serverNumber } = req.body;
  try {
    const servers = await ServerChannel.find({ serverNumber });
    if (servers.length === 0) {
      throw new NotFound('Company not found');
    }
    res.status(StatusCodes.OK).json(servers[0]);
  } catch (error) {
    throw error;
  }
};


const getServers = async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findById(companyId).populate('serverChannels');
    if (!company || company.serverChannels.length === 0) {
      throw new NotFound('Company not found');
    }
    res.status(StatusCodes.OK).json(company.serverChannels);
  } catch (error) {
    throw error;
  }
};


const getCompanyDetails = async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = await ServerChannel.findById(serverId);
    if (!server) {
      throw new NotFound('Company not found');
    }

    const serverObject = {
      serverId: server._id,
      companyId: server.companyId,
    };

    res.status(StatusCodes.OK).json(serverObject);
  } catch (error) {
    throw error;
  }
};


const addServer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { companyId, serverId } = req.body;

    if (!companyId) {
      throw new BadRequest('Company ID is required');
    }

    const company = await Company.findById(companyId).session(session);
    if (!company) {
      throw new NotFound('Company not found');
    }

    const server = await ServerChannel.create(
      [{
        companyId: company._id,
        serverNumber: serverId,
      }],
      { session }
    );

    company.serverChannels.push(server[0]._id);
    await company.save({ session });

    await session.commitTransaction();
    res.status(StatusCodes.CREATED).json({ server: server[0] });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};


const deleteServer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { serverId } = req.params;

    const deletedServer = await ServerChannel.findByIdAndDelete(serverId, { session });
    if (!deletedServer) {
      throw new BadRequest('Server not found');
    }

    const associatedCompany = await Company.findById(deletedServer.companyId);
    if (!associatedCompany) {
      throw new NotFound('Associated company not found');
    }

    associatedCompany.serverChannels.pull(deletedServer._id);
    await associatedCompany.save({ session });

    await session.commitTransaction();
    res.status(StatusCodes.OK).json({ serverId });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  loginServer,
  addServer,
  deleteServer,
  getServers,
  getCompanyDetails,
};
