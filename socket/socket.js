
class ConnectionManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: ["http://localhost:3001", "http://172.20.10.2:4000","http://localhost:3001/qr-scan",],
        methods: ["GET", "POST", "DELETE", "PUT"],
      },
    });

    this.userSocketMap = {}; // Maps userId to socketId
    this.serverSocketMap = {}; // Maps serverId to socketId
    this.registeredCompanies = new Set(); // Set to store unique company IDs
    this.customersByCompany = {}; // Stores customers grouped by companyId
    this.busyChannels = {}; // Structure to track busy servers and their customers
    this.availableServers = {}; // Stores available servers per company
    this.currentIdleChannels = {}; // Stores idle channels per company
    this.customersBeingServed = {}

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
    
    });
  }

  // Periodically check for idle servers andi if any assign any available customer to that
  // server
  serverEventHandler() {
    setInterval(async () => {
      for (const companyId in this.availableServers) {
        const idleChannels = this.currentIdleChannels[companyId]?.idleChannels || [];
        const onlineChannels = this.availableServers[companyId]?.onlineChannels || [];

        // Logic to handle idle servers
        if (onlineChannels.length > 0 && idleChannels.length > 0) {
          if (this.customersByCompany[companyId].waitingInLineCustomers.length > 0) {
            const nextCustomer = this.customersByCompany[companyId].waitingInLineCustomers.shift();
            const customerInfo = await Customer.findById(nextCustomer);
            const channelInfo = await Channel.findById(idleChannels[0]);
        
            this.fireUserSocket(nextCustomer, channelInfo);
            this.fireServerSocket(idleChannels[0], customerInfo);
        
            // Mark the server as busy by moving it from idle to busy state
            this.customersBeingServed[companyId][idleChannels[0]] = nextCustomer;
        
            // Remove from idle channels
            idleChannels.shift();
          }
        }
        
      }

      // Periodic log for debugging
      console.log('Every 7 seconds:');
      console.log('Customers by Company:', this.customersByCompany);
      console.log('Idle Channels:', this.currentIdleChannels);
      console.log('Available Channels:', this.availableServers);
      console.log('Serving Channels:', this.customersBeingServed);
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
      this.io.to(socketId).emit("Channel", { customerInfo: JSON.stringify(customerInfo) });
    }
  }
  // Emit a warning message to the server
  fireWarningSocket(serverId,warningMessage){
    const socketId = this.serverSocketMap[serverId];
    this.io.to(socketId).emit("serverWarning",warningMessage);
  }

    // Emit a status message to the server
    fireStatusSocket(serverId,statusMessage){
      const socketId = this.serverSocketMap[serverId];
      this.io.to(socketId).emit("serverIdle",statusMessage);
    }

// Handle server connections
handleServerConnection(socket, serverData) {
  const { serverId, companyId } = serverData;
  if (typeof serverId !== 'undefined' && typeof companyId !== 'undefined') {
    this.serverSocketMap[serverId] = socket.id; // Map server to socket ID
    if (this.registeredCompanies.has(companyId)) {
      // const idleChannels = this.currentIdleChannels[companyId]?.idleChannels || [];
      // if (!idleChannels.includes(serverId)) {
      //   idleChannels.push(serverId);
      // }
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
  console.log('inside client',userId)
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
  console.log('start');
  const { companyId, serverId } = data;
  if (typeof serverId !== 'undefined' && typeof companyId !== 'undefined') {
    const idleChannels = this.currentIdleChannels[companyId].idleChannels;
    
    // Check if the server is already serving a customer
    if (this.customersBeingServed[companyId][serverId]) {
      console.warn(`Server ${serverId} is already serving a customer!`);
      
      // Emit warning to the server
        this.fireWarningSocket(serverId, { message: `Server ${serverId} is already serving a customer!` })
    } else {
      // Add the server to the idle list if it's not already there
      if (!idleChannels.includes(serverId)) {
        idleChannels.push(serverId);

        // Emit idle status to the server
        const socketId = this.serverSocketMap[serverId];
        if (socketId) {
          this.fireStatusSocket(serverId,{ message: `Server ${serverId} is now idle for company ${companyId}` })
        }
      }
    }
  }
}

// Handle the end of service
async handleEndService(data) {
  console.log('end');
  const { companyId, serverId } = data;
  const idleChannels = this.currentIdleChannels[companyId].idleChannels;

  // Remove the server from the busy list and mark it as idle
  if (this.customersBeingServed[companyId][serverId]) {
    delete this.customersBeingServed[companyId][serverId];
    idleChannels.push(serverId);

    console.log(`Server ${serverId} is now idle for company ${companyId}`);

    // Emit idle status to the server
    this.fireStatusSocket(serverId,{ message: `Server ${serverId} is now idle for company ${companyId}` })
  } else {
    console.warn(`Server ${serverId} is not currently serving any customer.`);
    
    // Emit warning if the server is not serving any customer
    this.fireWarningSocket(serverId,{ message: `Server ${serverId} is not currently serving any customer.` })
  }
}


  // Handle socket disconnection
  handleDisconnection(socket) {
    for (const [userId, socketId] of Object.entries(this.userSocketMap)) {
      if (socketId === socket.id) {
        delete this.userSocketMap[userId];
        for (const companyId in this.customersByCompany) {
          const waitingList = this.customersByCompany[companyId].waitingInLineCustomers;
          const index = waitingList.indexOf(userId);
          if (index !== -1) {
            waitingList.splice(index, 1);
          }
        }
        break;
      }
    }

    for (const [serverId, socketId] of Object.entries(this.serverSocketMap)) {
      if (socketId === socket.id) {
        delete this.serverSocketMap[serverId];
        for (const companyId in this.currentIdleChannels) {
          const idleList = this.currentIdleChannels[companyId].idleChannels;
          const index = idleList.indexOf(serverId);
          if (index !== -1) {
            idleList.splice(index, 1);
          }
        }
        break;
      }
    }
  }

  // Setup socket listeners
  setupSocketListeners() {
    this.io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        const clientData = socket.handshake.query.clientData;
        const serverData = socket.handshake.query.serverData;

        // Handle server data
        if (serverData) {
            try {
                const parsedServerData = JSON.parse(serverData);
                this.handleServerConnection(socket, parsedServerData);
            } catch (error) {
                console.error("Error parsing serverData:", error);
            }
        }

        // Handle client data
        if (clientData) {
            try {
                const parsedClientData = JSON.parse(clientData);
                this.handleClientConnection(socket, parsedClientData);
            } catch (error) {
                console.error("Error parsing clientData:", error);
            }
        }

        socket.on("endService", (data) => this.handleEndService(data));
        socket.on("startService", (data) => this.handleStartService(data));
        socket.on("disconnect", () => this.handleDisconnection(socket));
    });
}

}
const { Server } = require("socket.io");
const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app) 
const Company = require("../models/company");
const Customer = require("../models/customer");
const Channel = require("../models/server");

// Initialize the ConnectionManager
const connectionManager = new ConnectionManager(server);

module.exports = { app, server, express };  // Ensure this is exported