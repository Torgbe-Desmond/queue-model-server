const express = require('express');
const router = express.Router();
const { getAllServers, addServer, deleteServer } = require('../controllers/server');

// Get all servers endpoint
router.get('/getAllServers', getAllServers);

// Add server endpoint
router.post('/addServer', addServer);

// Delete server endpoint
router.delete('/deleteServer/:serverId', deleteServer);

module.exports = router;
