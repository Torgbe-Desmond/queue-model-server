const { Server } = require("socket.io");
const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const Company = require("../models/company");
const Customer = require("../models/customer");
const Channel = require("../models/server");

class ConnectionManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: ["https://queue-it-p53j.vercel.app", "http://172.20.10.2:4000"],
        methods: ["GET", "POST", "DELETE", "PUT"],
      },
    });

    this.userSocketMap = {}; // Maps userId to socketId
    this.adminSocketMap = {};
    this.serverSocketMap = {}; // Maps serverId to socketId
    this.registeredCompanies = new Set(); // Set to store unique company IDs
    this.customersByCompany = {}; // Stores customers grouped by companyId
    this.busyChannels = {}; // Structure to track busy servers and their customers
    this.availableServers = {}; // Stores available servers per company
    this.currentIdleChannels = {}; // Stores idle channels per company
    this.customersBeingServed = {};
    this.customersBeingServedQueueNumber = {}; // Tracks queue numbers for customers being served

    this.initializeState();
    this.setupSocketListeners();
    this.serverEventHandler(); // Start periodic check
  }

  // Initialize state for companies
  async initializeState() {
    const companies = await Company.find({});
    companies.forEach(company => {
      const companyId = company._id.toString();
      this.registeredCompanies.add(companyId);
      this.customersByCompany[companyId] = { waitingInLineCustomers: [] };
      this.busyChannels[companyId] = { busyChannels: [] };
      this.availableServers[companyId] = { onlineChannels: [] };
      this.currentIdleChannels[companyId] = { idleChannels: [] };
      this.customersBeingServed[companyId] = {};
      this.customersBeingServedQueueNumber[companyId] = {}; // Initialize queue numbers
    });
  }

  // Periodically check for idle servers and assign available customers to them
  serverEventHandler() {
    setInterval(async () => {
      for (const companyId in this.availableServers) {

        // Handle sending active server to the appropriate administration dashboard
        this.emitActiveServers();

        const idleChannels = this.currentIdleChannels[companyId]?.idleChannels || [];
        const onlineChannels = this.availableServers[companyId]?.onlineChannels || [];
        const waitingInLineCustomers = this.customersByCompany[companyId].waitingInLineCustomers || [];

        if (onlineChannels.length > 0 && idleChannels.length > 0) {

          if (waitingInLineCustomers.length > 0) {

            const nextAvailableCustomer = waitingInLineCustomers.shift();
            const nextAvailableServer = idleChannels.shift();

            console.log(nextAvailableCustomer);
            console.log(nextAvailableServer);

            const customerInfo = await Customer.findById(nextAvailableCustomer).select('-password').populate('image');
            const channelInfo = await Channel.findById(nextAvailableServer).select('-password');

            this.fireUserSocket(nextAvailableCustomer, channelInfo);
            this.fireServerSocket(nextAvailableServer, customerInfo);

            // Track which customer is being served by which server
            this.customersBeingServed[companyId][nextAvailableServer] = nextAvailableCustomer;

            // Set queue number for the customer being served
            this.customersBeingServedQueueNumber[companyId][nextAvailableCustomer] = waitingInLineCustomers.length + 1; // Queue number is based on remaining customers
          }
        }

      }

      // Periodic log for debugging
      console.log('Every 7 seconds:');
      console.log('Customers by Company:', this.customersByCompany);
      console.log('Idle Channels:', this.currentIdleChannels);
      console.log('Available Channels:', this.availableServers);
      console.log('Serving Channels:', this.customersBeingServed);
      console.log('Logged in companies', this.adminSocketMap);
    }, 7000);
  }

  // Emit a message to a user
  fireUserSocket(userId, channelInfo) {
    const socketId = this.userSocketMap[userId];
    if (socketId) {
      this.io.to(socketId).emit("Customer", { channelInfo });
    }
  }

  // Emit a message to a server
  fireServerSocket(serverId, customerInfo) {
    const socketId = this.serverSocketMap[serverId];
    if (socketId) {
      this.io.to(socketId).emit("Channel", { customerInfo });
    }
  }

  // Emit a warning message to the server
  fireAdminSocket(companyId, adminInformation) {
    const socketId = this.adminSocketMap[companyId];
    if (socketId) {
      this.io.to(socketId).emit("online", adminInformation);
    }
  }

  // Emit a warning message to the server
  fireWarningSocket(serverId, warningMessage) {
    const socketId = this.serverSocketMap[serverId];
    this.io.to(socketId).emit("serverWarning", warningMessage);
  }

  // Emit a status message to the server
  fireStatusSocket(serverId, statusMessage) {
    const socketId = this.serverSocketMap[serverId];
    this.io.to(socketId).emit("serverIdle", statusMessage);
  }

  // To send a message outside this class
  getUserSocketMap(userId) {
    return this.userSocketMap[userId];
  }

  // To use the io outside this class
  getIO() {
    return this.io;
  }

  // Emit active servers to their corresponding company
  emitActiveServers() {
    // Iterate over adminId keys in availableServers
    for (const companyId of Object.keys(this.adminSocketMap)) {
      console.log('inside emit active servers', companyId);
      if (this.registeredCompanies.has(companyId)) {
        const activeChannels = this.availableServers[companyId].onlineChannels;
        console.log(activeChannels);
        let activeServers = [];
        activeChannels.forEach(channel => {
          activeServers.push(channel);
          this.fireAdminSocket(companyId, { active: activeServers });
        });
      }
    }
  }

  handleAdmistration(socket, adminData) {
    const { companyId } = adminData;
    if (typeof companyId !== 'undefined') {
      this.adminSocketMap[companyId] = socket.id;
    }
  }

  // Handle server connections
  handleServerConnection(socket, serverData) {
    const { serverId, companyId } = serverData;

    if (typeof serverId !== 'undefined' && typeof companyId !== 'undefined') {
      this.serverSocketMap[serverId] = socket.id; // Map server to socket ID

      if (this.registeredCompanies.has(companyId)) {
        if (!this.availableServers[companyId]?.onlineChannels.includes(serverId)) {
          const idleChannels = this.currentIdleChannels[companyId]?.idleChannels || [];
          if (!idleChannels.includes(serverId)) {
            idleChannels.push(serverId);
          }
        }

        const availableServers = this.availableServers[companyId]?.onlineChannels || [];
        if (!availableServers.includes(serverId)) {
          availableServers.push(serverId);
        }
      }
    }
  }

  // Handle client/user connections
  async handleClientConnection(socket, clientData) {
    const { companyId, userId } = clientData;
    if (typeof userId !== 'undefined' && typeof companyId !== 'undefined') {
      this.userSocketMap[userId] = socket.id;
      const waitingCustomers = this.customersByCompany[companyId]?.waitingInLineCustomers || [];
      if (!waitingCustomers.includes(userId)) {
        waitingCustomers.push(userId);
      }
    }
  }

  // Handle add server to idle customers
  async handleStartService(data) {
    const { companyId, serverId } = data;
    if (typeof serverId !== 'undefined' && typeof companyId !== 'undefined') {
      const idleChannels = this.currentIdleChannels[companyId].idleChannels;

      // Check if the server is already serving a customer
      if (this.customersBeingServed[companyId][serverId]) {
        console.warn(`Server ${serverId} is already serving a customer!`);

        // Emit warning to the server
        this.fireWarningSocket(serverId, { message: `Server ${serverId} is already serving a customer!` });
      } else {
        // Add the server to the idle list if it's not already there
        if (!idleChannels.includes(serverId)) {
          idleChannels.push(serverId);

          // Emit idle status to the server
          this.fireStatusSocket(serverId, { message: `Server ${serverId} is now idle for company ${companyId}` });
        }
      }
    }
  }

  // Handle the end of service
  async handleEndService(data) {
    const { companyId, serverId } = data;
    const idleChannels = this.currentIdleChannels[companyId].idleChannels;

    // Remove the server from the busy list and mark it as idle
    if (this.customersBeingServed[companyId][serverId]) {
      console.log(serverId);
      delete this.customersBeingServed[companyId][serverId];
      idleChannels.push(serverId);

      console.log(`Server ${serverId} is now idle for company ${companyId}`);

      // Emit idle status to the server
      this.fireStatusSocket(serverId, { message: `Server ${serverId} is now idle for company ${companyId}` });
    }
  }

  // Disconnect handling for users
  handleUserDisconnect(socketId) {
    for (const userId in this.userSocketMap) {
      if (this.userSocketMap[userId] === socketId) {
        delete this.userSocketMap[userId];
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  }

  // Disconnect handling for servers
  handleServerDisconnect(socketId) {
    for (const serverId in this.serverSocketMap) {
      if (this.serverSocketMap[serverId] === socketId) {
        delete this.serverSocketMap[serverId];
        console.log(`Server ${serverId} disconnected`);
        break;
      }
    }
  }

  // Disconnect handling for admins
  handleAdminDisconnect(socketId) {
    for (const companyId in this.adminSocketMap) {
      if (this.adminSocketMap[companyId] === socketId) {
        delete this.adminSocketMap[companyId];
        console.log(`Admin ${companyId} disconnected`);
        break;
      }
    }
  }

  // Setting up the socket listeners
  setupSocketListeners() {
    this.io.on("connection", (socket) => {
      console.log("A user connected", socket.id);

      // Handle admin connections
      socket.on("admin", (adminData) => this.handleAdmistration(socket, adminData));

      // Handle server connections
      socket.on("server", (serverData) => this.handleServerConnection(socket, serverData));

      // Handle client/user connections
      socket.on("customer", (clientData) => this.handleClientConnection(socket, clientData));

      // Handle start service event
      socket.on("startService", (data) => this.handleStartService(data));

      // Handle end service event
      socket.on("endService", (data) => this.handleEndService(data));

      // Handle disconnections
      socket.on("disconnect", () => {
        this.handleUserDisconnect(socket.id);
        this.handleServerDisconnect(socket.id);
        this.handleAdminDisconnect(socket.id);
      });
    });
  }
}


// Initialize the ConnectionManager
const connectionManager = new ConnectionManager(server);

module.exports = { app, server, express,connectionManager };  // Ensure this is exported