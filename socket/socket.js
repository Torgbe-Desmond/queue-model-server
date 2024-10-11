class ConnectionManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: ["http://localhost:4000", "http://172.20.10.2:4000"],
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
    this.startIdleServerCheck(); // Start periodic check
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

  // Periodically check for idle servers and perform some action
  startIdleServerCheck() {
    setInterval(async () => {
      for (const companyId in this.availableServers) {
        const idleChannels = this.currentIdleChannels[companyId].idleChannels;
        const onlineChannels = this.availableServers[companyId].onlineChannels;

        console.log(`Checking idle servers for company ${companyId}`);
        console.log(`Idle channels: ${idleChannels}`);
        console.log(`Online channels: ${onlineChannels}`);

        // Logic to handle idle servers
        if (onlineChannels.length && idleChannels.length) {
          console.log(`Company ${companyId} has idle servers. Taking appropriate actions.`);
          if(customersByCompany[companyId].waitingInLineCustomerslength > 0 ){
              const nextCustomer = customersByCompany[companyId].waitingInLineCustomerslength.shift();
              const customerInfo = await Customer.findById(nextCustomer);
              const channelInfo = await Channel.findById(idleChannels[0]);
              this.fireUserSocket(nextCustomer, channelInfo);
              this.fireServerSocket(idleChannels[0], customerInfo);
          }
        }
      }
    }, 5000); // Runs every 5 seconds
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

  // Emit message for a newly joined customer
  fireNewlyjoinedCustomer(serverId, customerInfo) {
    const socketId = this.serverSocketMap[serverId];
    if (socketId) {
      this.io.to(socketId).emit("NewCustomer", { customerInfo: JSON.stringify(customerInfo) });
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

  // Handle the end of service
  async handleEndStartService(data) {
    const { companyId, serverId } = data;
    const waitingCustomers = this.customersByCompany[companyId].waitingInLineCustomers;
    const availableServers = this.availableServers[companyId].onlineChannels;


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

      if (serverData && serverData !== "undefined") {
        this.handleServerConnection(socket, JSON.parse(serverData));
      }

      if (clientData && clientData !== "undefined") {
        this.handleClientConnection(socket, JSON.parse(clientData));
      }

      socket.on("endService", (data) => this.handleEndStartService(data));
      socket.on("disconnect", () => this.handleDisconnection(socket));
    });
  }
}

// Initialize express and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize the ConnectionManager
const connectionManager = new ConnectionManager(server);

module.exports = { app, server };
