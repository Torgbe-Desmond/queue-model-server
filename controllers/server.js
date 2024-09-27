const ServerChannel = require('../models/server');
const Company = require('../models/company');
const mongoose = require('mongoose');
const { generateRandomString } = require('../utils/generateRandomString');

// Get all servers
const getAllServers = async (req, res) => {
    try {
        const servers = await ServerChannel.find();
        // Check if there are any servers
        if (servers.length === 0) {
            return res.status(404).json({ message: 'No servers found' });
        }
        res.status(200).json(servers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add a new server
const addServer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { companyId } = req.body;
        const getCompanyName = await Company.findOne({ _id: companyId });
        const newServerName = `${getCompanyName.name}_${generateRandomString(10)}`;

        await ServerChannel.create({
            name: newServerName,
            companyId,
            serverNumber: generateRandomString(5)
        }, { session });

        await session.commitTransaction();
        res.status(201).json({ message: 'Server added successfully' });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
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
        res.status(200).json({ message: 'Server deleted successfully' });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        session.endSession();
    }
};

module.exports = {
    getAllServers,
    addServer,
    deleteServer
};
