
class ConnectionManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: ["http://localhost:3001", "http://172.20.10.2:4000","https://queue-model-server.onrender.com"],
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

    this.initializeState();
    this.setupSocketListeners();
    this.serverEventEventHandelr(); // Start periodic check
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
    });
  }

  // Periodically check for idle servers andi if any assign any available customer to that
  // server
  serverEventEventHandelr() {
    setInterval(async () => {
      for (const companyId in this.availableServers) {
        const idleChannels = this.currentIdleChannels[companyId]?.idleChannels;
        const onlineChannels = this.availableServers[companyId]?.onlineChannels;

        // Logic to handle idle servers
        if (onlineChannels.length && idleChannels.length) {
          if(customersByCompany[companyId].waitingInLineCustomerslength > 0 ){
              const nextCustomer =  customersByCompany[companyId].waitingInLineCustomerslength.shift();
              const customerInfo =  await Customer.findById(nextCustomer);
              const channelInfo  =  await Channel.findById(idleChannels[0]);
              this.fireUserSocket(nextCustomer, channelInfo);
              this.fireServerSocket(idleChannels[0], customerInfo);
          }
        }
      }
      console.log('every 5 seconds')
    }, 5000); 
  }

  // Emit a message to a user
  fireUserSocket(userId, channelInfo) {
    const socketId = this.userSocketMap[userId];
    if (socketId) {
      this.io.to(socketId).emit("Customer", { channelInfo: JSON.stringify(channelInfo) });
    }
  }

  // Emit a message to a server
  fireServerSocket(serverId, customerInfo) {
    const socketId = this.serverSocketMap[serverId];
    if (socketId) {
      this.io.to(socketId).emit("Channel", { customerInfo: JSON.stringify(customerInfo) });
    }
  }

  // Handle server connections
  handleServerConnection(socket, serverData) {
    const { serverId, companyId } = serverData;
    this.serverSocketMap[serverId] = socket.id; // Map server to socket ID
    if (this.registeredCompanies.has(companyId)) {
      const availableServers = this.availableServers[companyId].onlineChannels;
      if (!availableServers.includes(serverId)) {
        availableServers.push(serverId);
      }
    }
  }

  // Handle client/user connections
  async handleClientConnection(socket, clientData) {
    const { companyId, userId } = clientData;
    this.userSocketMap[userId] = socket.id;
    const waitingCustomers = this.customersByCompany[companyId]?.waitingInLineCustomers || [];
    if (!waitingCustomers.includes(userId)) {
      waitingCustomers.push(userId);
    }
  }

  // handle add server to idle customers
  async handleStartService(data) {
    const { companyId, serverId } = data;
    const idleChannels =  this.currentIdleChannels[companyId].idleChannels;
    if(!idleChannels.includes(serverId)){
      idleChannels.push(serverId)
    }
  }


  // Handle the end of service
  async handleEndService(data){
    const { companyId, serverId } = data;
    const idleChannels =  this.currentIdleChannels[companyId].idleChannels;
    if(idleChannels.includes(serverId)){
       const indexOfServer = idleChannels.indexOf(serverId);
       if(indexOfServer !== -1){
          idleChannels.splice(indexOfServer,1)
       }
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