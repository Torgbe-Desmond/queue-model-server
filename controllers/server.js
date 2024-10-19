const ServerChannel = require('../models/server');
const Company = require('../models/company');
const mongoose = require('mongoose');
const { generateRandomString } = require('../utils/generateRandomString');

// Get all servers
const loginServer = async (req, res) => {
    const { serverNumber} = req.body
    console.log('.... serverNumber',serverNumber)
    try {
        const servers = await ServerChannel.find({serverNumber});
        console.log(servers)
        // Check if there are any servers
        if (servers.length === 0) {
            return res.status(404).json({ message: 'No servers found' });
        }
        res.status(200).json(servers[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getServers = async (req, res) => {
    try {
        const { companyId } = req.params;
        const servers = await Company.findById(companyId).populate('serverChannels');
        console.log(servers)
        // Check if there are any servers
        if (servers.length === 0) {
            return res.status(404).json({ message: 'No servers found' });
        }
        res.status(200).json(servers.serverChannels);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// Add a new server
const addServer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { companyId , serverId } = req.body;

        console.log(companyId , serverId)
        // Validate companyId before proceeding
        if (!companyId) {
            throw new Error('Company ID is required');
        }

        // Fetch the company name based on the provided companyId
        const getCompanyName = await Company.findById(companyId).session(session);
        if (!getCompanyName) {
            throw new Error('Company not found');
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
        console.error('Transaction error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
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
            return res.status(404).json({ message: 'Server not found' });
        }
        await ServerChannel.deleteOne({ _id: serverId }, { session });
        await session.commitTransaction();
        res.status(200).json({success:true });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        session.endSession();
    }
};

module.exports = {
    loginServer,
    addServer,
    deleteServer,
    getServers
};
