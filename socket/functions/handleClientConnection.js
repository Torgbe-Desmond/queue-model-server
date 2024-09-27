function handleClientConnection(
    _clientData,
    socket,
    userSocketMap,
    serverSocketMap, 
    customersByCompany, 
    availableServers, 
    busyChannels,
    io 
  ){
    if (_clientData && _clientData !== "undefined") {
      const { companyId, userId } = _clientData;
      userSocketMap[userId] = socket.id;
  
      if (customersByCompany[companyId]) {
        const _busyChannels = busyChannels[companyId]?.busyChannels || [];
        console.log('busyChannels',busyChannels)
        const _freeChannels = availableServers[companyId]?.onlineChannels.filter(serverId => !_busyChannels.includes(serverId)) || [];
        console.log('_freeChannels',_freeChannels)

        if(_freeChannels.length > 0){
            let newlyAssignedChannel = _freeChannels[0];
            busyChannels[companyId]?.busyChannels.push(newlyAssignedChannel);
            io.to(userSocketMap[userId]).emit('Channel',{message:'visit server 1'});
            io.to(serverSocketMap[newlyAssignedChannel]).emit('Customer',{message:'details on next customer'})
        }

        if(_freeChannels.length === 0){
            customersByCompany[companyId].waitingInLineCustomers.push(userId)
        }

    }
  }
  }
  module.exports = handleClientConnection;
  

  '66ed892d456d4bf717df54da'
  '66ed892d456d4bf717df54da'