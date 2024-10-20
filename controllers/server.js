const ServerChannel = require('../models/server');
const Company = require('../models/company');
const mongoose = require('mongoose');
const { generateRandomString } = require('../utils/generateRandomString');
const BadRequest = require('../Errors/BadRequest');
const { StatusCodes } = require('http-status-codes');
const NotFound = require('../Errors/Notfound');

// Get all servers
const loginServer = async (req, res) => {
    const { serverNumber} = req.body
    try {
        const servers = await ServerChannel.find({serverNumber});
        // Check if there are any servers
        if (servers.length === 0) {
            throw new NotFound('Company not found');
        }
        res.status(200).json(servers[0]);
    } catch (error) {
        throw error;
    }
};

const getServers = async (req, res) => {
    try {
        const { companyId } = req.params;
        const servers = await Company.findById(companyId).populate('serverChannels');
        // Check if there are any servers
        if (servers.length === 0) {
            throw new NotFound('Company not found');
        }
        res.status(200).json(servers.serverChannels);
    } catch (error) {
        throw error;
    }
};


const getCompanyDetails = async (req, res) => {
    try {
        const { serverId } = req.params;
        const server = await ServerChannel.findById(serverId).populate('serverChannels');
        // Check if there are any server
        if (!server) {
            throw new NotFound('Company not found');
        }

        const serverObject = {
            serverId:server._id,
            companyId:server.companyId
        }

        res.status(200).json(serverObject);
    } catch (error) {
        throw error;
    }
};


// Add a new server
const addServer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { companyId , serverId } = req.body;
        // Validate companyId before proceeding
        if (!companyId) {
            throw new BadRequest('Company ID is required');
        }

        // Fetch the company name based on the provided companyId
        const getCompanyName = await Company.findById(companyId).session(session);
        if (!getCompanyName) {
            throw new NotFound('Company not found');
        }

        // Create a new server channel
        const server = await ServerChannel.create([{
            companyId:getCompanyName._id,
            serverNumber:serverId
        }], { session });

        getCompanyName.serverChannels.push(server[0]._id)
        
        await getCompanyName.save()
        // Commit the transaction if everything goes well
        await session.commitTransaction();
        res.status(201).json({ server:server[0] });
    } catch (error) {
        // Abort the transaction in case of an error
        await session.abortTransaction();
        throw error;
    } finally {
        // End the session
        session.endSession();
    }
};


// Delete a server
const deleteServer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { serverId } = req.params;
        const server = await ServerChannel.findById(serverId);
        if (!server) {
            throw new BadRequest('Server not found')
        }
        const deletedServer = await ServerChannel.deleteOne({ _id: serverId }, { session });

        const associatedCompany = await Company.findById(deletedServer.companyId);
        associatedCompany.serverChannels.pull(deletedServer._id);

        await associatedCompany.save();

        await session.commitTransaction();
        res.status(StatusCodes.OK).json({success:true});
    } catch (error) {
        await session.abortTransaction();
        throw error
    } finally {
        session.endSession();
    }
};

module.exports = {
    loginServer,
    addServer,
    deleteServer,
    getServers,
    getCompanyDetails
};
