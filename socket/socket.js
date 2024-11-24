const { Server } = require("socket.io");
const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const Company = require("../models/company");
const Customer = require("../models/customer");

class ConnectionManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: ["https://queue-it-p53j.vercel.app", "http://172.20.10.2:4000", "http://localhost:3000"],
        methods: ["GET", "POST", "DELETE", "PUT"],
      },
    });

    this.userSocketMap = {};
    this.adminSocketMap = {};
    this.serverSocketMap = {};
    this.registeredCompanies = new Set();
    this.customersByCompany = {};
    this.busyChannels = {};
    this.availableServers = {};
    this.currentIdleChannels = {};
    this.customersBeingServed = {};
    this.customersBeingServedQueueNumber = {};

    this.initializeState();
    this.setupSocketListeners();
    // this.serverEventHandler();
  }

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
      this.customersBeingServedQueueNumber[companyId] = {};
    });
  }

  serverEventHandler() {
    setInterval(() => {
      console.log('Periodic check at 7 seconds:');
      console.log('Customers by Company:', this.customersByCompany);
      console.log('Idle Channels:', this.currentIdleChannels);
      console.log('Available Channels:', this.availableServers);
      console.log('Serving Channels:', this.customersBeingServed);
    }, 7000);
  }
  
  async checkAndAssignCustomersToServers(companyId) {
    const idleChannels = this.currentIdleChannels[companyId]?.idleChannels || [];
    const waitingInLineCustomers = this.customersByCompany[companyId]?.waitingInLineCustomers || [];
  
    this.fireNumberOFCustomersSocket();
    this.emitActiveServers();
  
    while (waitingInLineCustomers.length > 0 && idleChannels.length > 0) {
      const nextAvailableCustomer = waitingInLineCustomers.shift();
      const nextAvailableServer = idleChannels.shift(); 
  
      const customerInfo = await Customer.findById(nextAvailableCustomer).select('-password').populate('image');
      const channelInfo = await Channel.findById(nextAvailableServer).select('-password');
  
      this.fireUserSocket(nextAvailableCustomer, channelInfo);
      this.fireServerSocket(nextAvailableServer, customerInfo);
  
      this.customersBeingServed[companyId][nextAvailableServer] = nextAvailableCustomer;
  
    }
  }
  
  fireUserSocket(userId, channelInfo) {
    const socketId = this.userSocketMap[userId];
    if (socketId) {
      this.io.to(socketId).emit("Customer", { channelInfo });
    }
  }

  fireServerSocket(serverId, customerInfo) {
    const socketId = this.serverSocketMap[serverId];
    if (socketId) {
      this.io.to(socketId).emit("Channel", { customerInfo });
    }
  }

  fireAdminSocket(companyId, adminInformation) {
    const socketId = this.adminSocketMap[companyId];
    if (socketId) {
      this.io.to(socketId).emit("online", adminInformation);
    }
  }

  fireWarningSocket(serverId, warningMessage) {
    const socketId = this.serverSocketMap[serverId];
    this.io.to(socketId).emit("serverWarning", warningMessage);
  }

  fireNumberOFCustomersSocket() {
    for (const companyId of Object.keys(this.adminSocketMap)) {
      const waitingCustomers = this.customersByCompany[companyId].waitingInLineCustomers || [];
      waitingCustomers.forEach(customer => {
        const socketId = this.userSocketMap[customer];
        const customerQueueNumber = this.customersByCompany[companyId]?.waitingInLineCustomers?.indexOf(customer) + 2;
        this.io.to(socketId).emit("customerNumber", { queueNumber: customerQueueNumber });
      });
    }
  }

  fireStatusSocket(serverId, statusMessage) {
    const socketId = this.serverSocketMap[serverId];
    this.io.to(socketId).emit("serverIdle", statusMessage);
  }

  emitActiveServers() {
    for (const companyId of Object.keys(this.adminSocketMap)) {
      if (this.registeredCompanies.has(companyId)) {
        const activeChannels = this.availableServers[companyId].onlineChannels;
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
    if (companyId) {
      this.adminSocketMap[companyId] = socket.id;
    }
  }

  handleServerConnection(socket, serverData) {
    const { serverId, companyId } = serverData;
    if (serverId && companyId) {
      this.serverSocketMap[serverId] = socket.id;

      if (this.registeredCompanies.has(companyId)) {
        const idleChannels = this.currentIdleChannels[companyId]?.idleChannels || [];
        if (!idleChannels.includes(serverId)) {
          idleChannels.push(serverId);
        }

        const availableServers = this.availableServers[companyId]?.onlineChannels || [];
        if (!availableServers.includes(serverId)) {
          availableServers.push(serverId);
        }
      }
    }
  }

  async handleClientConnection(socket, clientData) {
    const { companyId, userId } = clientData;
    if (userId && companyId) {
      this.userSocketMap[userId] = socket.id;
      const waitingCustomers = this.customersByCompany[companyId]?.waitingInLineCustomers || [];
      if (!waitingCustomers.includes(userId)) {
        waitingCustomers.push(userId);
      }
    }
  }

  async handleStartService(data) {
    const { companyId, serverId } = data;
    if (serverId && companyId) {
      const idleChannels = this.currentIdleChannels[companyId].idleChannels;
      if (this.customersBeingServed[companyId][serverId]) {
        this.fireWarningSocket(serverId, { message: `Server ${serverId} is already serving a customer!` });
      } else {
        if (!idleChannels.includes(serverId)) {
          idleChannels.push(serverId);
          this.fireStatusSocket(serverId, { message: `Server ${serverId} is now idle for company ${companyId}` });
        }
      }
    }
  }

  async handleEndService(data) {
    const { companyId, serverId } = data;
    const idleChannels = this.currentIdleChannels[companyId].idleChannels;

    if (this.customersBeingServed[companyId][serverId]) {
      delete this.customersBeingServed[companyId][serverId];
      idleChannels.push(serverId);
      this.fireStatusSocket(serverId, { message: `Server ${serverId} is now idle for company ${companyId}` });
    } else {
      this.fireWarningSocket(serverId, { message: `Server ${serverId} is not currently serving any customer.` });
    }
  }

  handleDisconnection(socket) {
    console.log('handle disconnection success');
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
          const onlineList = this.availableServers[companyId].onlineChannels;
          const onlineIndex = onlineList.indexOf(serverId);
          if (onlineIndex !== -1) {
            onlineList.splice(onlineIndex, 1);
          }
        }
        break;
      }
    }

    for (const [companyId, socketId] of Object.entries(this.adminSocketMap)) {
      if (socketId === socket.id) {
        delete this.adminSocketMap[companyId];
        break;
      }
    }
  }

  setupSocketListeners() {
    this.io.on("connection", (socket) => {
      console.log("New client connected");
  
      socket.on("admin", (adminData) => {
        this.handleAdmistration(socket, adminData);
      });
  
      socket.on("server", (serverData) => {
        this.handleServerConnection(socket, serverData);
        this.checkAndAssignCustomersToServers(serverData.companyId); 
      });
  
      socket.on("customer", (clientData) => {
        this.handleClientConnection(socket, clientData);
        this.checkAndAssignCustomersToServers(clientData.companyId); 
      });
  
      socket.on("startService", (data) => {
        this.handleStartService(data);
      });
  
      socket.on("endService", (data) => {
        this.handleEndService(data);
      });
  
      socket.on("disconnect", () => {
        this.handleDisconnection(socket);
      });
    });
  }
  
  
}

const connectionManager = new ConnectionManager(server);
module.exports = {app, server}
