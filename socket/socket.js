const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const Company = require('../models/company');
const Channel = require('../models/server')
const Customer = require('../models/customer')
const handleClientConnection = require("./functions/handleClientConnection");
const handleServerConnection = require("./functions/handleServerConnection");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "DELETE", "PUT"],
  },
});

// State Objects
const userSocketMap = {}; // Maps userId to socketId
const serverSocketMap = {}; // Maps serverId to socketId
const registeredCompanies = new Set(); // Set to store unique company IDs
const customersByCompany = {}; // Stores customers grouped by companyId
const busyChannels = {}; // Structure to track busy servers and their customers
const availableServers = {}; // Stores available servers per company

// Function to initialize state
const initializeState = async () => {
  const companies = await Company.find({});
  companies.forEach(company => {
    const companyId = company._id.toString();
    registeredCompanies.add(companyId);
    // Initialize customer lists
    customersByCompany[companyId] = {  waitingInLineCustomers: [] };
    busyChannels[companyId] = { busyChannels: [] };
    availableServers[companyId] = { onlineChannels: [] };
  });
};

// Call initialization function on server startup
initializeState();

// Function to retrieve socket ID by userId
const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

io.on("connection",  async (socket) => {
  console.log("A user connected:", socket.id);
  const clientData = socket.handshake.query.clientData;
  const serverData = socket.handshake.query.serverData;

  // Handle server connection
  if (serverData && serverData !== "undefined") {
    const _serverData = JSON.parse(serverData);
    if (_serverData) {
      const { serverId, companyId } = _serverData;
      serverSocketMap[serverId] = socket.id;

      // Ensure company is registered
      if (registeredCompanies.has(companyId)) {
        availableServers[companyId].onlineChannels.push(serverId);
      }
    }
  }

  // Handle client connection
  if (clientData && clientData !== "undefined") {
    const _clientData = JSON.parse(clientData);
    if (_clientData) {
      const { companyId, userId } = _clientData;
      userSocketMap[userId] = socket.id;

      // Ensure customer lists exist
      if (customersByCompany[companyId]) {
        const busyServers = busyChannels[companyId].busyChannels || [];
        const freeChannels = availableServers[companyId].onlineChannels.filter(serverId => !busyServers.includes(serverId));
        
        if (freeChannels.length > 0) {
          const assignedChannel = freeChannels[0];
          busyChannels[companyId].busyChannels.push(assignedChannel);
          const getCustomerInfo = await Customer.findById(userId)
          const getChannelInfo = await Server.findById(assignedChannel)
          io.to(userSocketMap[userId]).emit('Channel',  {data: getCustomerInfo});
          io.to(serverSocketMap[assignedChannel]).emit('Customer',  {data: getChannelInfo});
        } else {
          customersByCompany[companyId].waitingInLineCustomers.push(userId);
        }
      }
    }
  }

  socket.on('nextCustomer',async (data) => {
    const { companyId, serverId } = data;

    let userId;
    // Check if the server is busy
    if (busyChannels[companyId].busyChannels.includes(serverId)) {
        console.log('Server is busy');
        
        // Remove the server from busy channels
        let indexOfServer = busyChannels[companyId].busyChannels.indexOf(serverId);
        if (indexOfServer !== -1) {
            busyChannels[companyId].busyChannels.splice(indexOfServer, 1);

            // Log the waiting customers before the shift
            console.log('Before shift, waitingInLineCustomers:', customersByCompany[companyId].waitingInLineCustomers);

            // Get the next waiting customer
            userId = customersByCompany[companyId].waitingInLineCustomers.shift(); // Remove and get first customer

            // Log the waiting customers after the shift
            console.log('After shift, waitingInLineCustomers:', customersByCompany[companyId].waitingInLineCustomers);

            console.log('Next userId:', userId);
        }

        const $busyChannels = busyChannels[companyId]?.busyChannels || [];
        const $freeServers = availableServers[companyId].onlineChannels.filter(sId => !$busyChannels.includes(sId));

        if (userId && userSocketMap[userId] && $freeServers.length > 0) {
            // Assign the next available server to the customer
            const nextServerId = $freeServers[0];  // Select the first available server
            busyChannels[companyId].busyChannels.push(nextServerId);

            const getCustomerInfo = await Customer.findById(userId)
            const getChannelInfo = await Server.findById(assignedChannel)
            io.to(userSocketMap[userId]).emit('Channel', {data: getChannelInfo});
            io.to(serverSocketMap[nextServerId]).emit('Customer', { data: getCustomerInfo });
        } else {
            console.log('No available servers or customers.');
        }

    } else {
        // If the server is not busy, mark it as busy with the next customer
        userId = customersByCompany[companyId].waitingInLineCustomers.shift();  // Get the next customer
        if (userId) {
            busyChannels[companyId].busyChannels.push(serverId);
            console.log(`User ${userId} assigned to server ${serverId} for company ${companyId}`);

            // Notify both the server and the customer
            const getCustomerInfo = await Customer.findById(userId)
            const getChannelInfo = await Server.findById(serverId)
            io.to(userSocketMap[userId]).emit('Channel',  {data: getCustomerInfo});
            io.to(serverSocketMap[serverId]).emit('Customer',  {data: getChannelInfo});
            
        } else {
            console.log('No customers waiting.');
        }
    }
});





  console.log('........................................')
  console.log('customersByCompany',customersByCompany)
  console.log('userSocketMap',userSocketMap)
  console.log('serverSocketMap',serverSocketMap)
  console.log('availableServers',availableServers)
  console.log('busyChannels',busyChannels)
  console.log('........................................')

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log("A user disconnected:", socket.id);
    for (const [userId, socketId] of Object.entries(userSocketMap)) {
      if (socketId === socket.id) {
        delete userSocketMap[userId];
        for (const companyId in customersByCompany) {
          const index = customersByCompany[companyId].waitingInLineCustomers.indexOf(userId);
          if (index !== -1) {
            customersByCompany[companyId].waitingInLineCustomers.splice(index, 1);
          }
        }
        for (const companyId in busyChannels) {
          const index = busyChannels[companyId].busyChannels.indexOf(userId);
          if (index !== -1) {
            busyChannels[companyId].busyChannels.splice(index, 1);
          }
        }
        break;
      }
    }
  });
});

module.exports = { app, io, server, getReceiverSocketId };
