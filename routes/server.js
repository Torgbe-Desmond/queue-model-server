const express = require('express');
const router = express.Router();
const { loginServer, addServer, deleteServer, getServers,getCompanyDetails } = require('../controllers/server');

// Get all servers endpoint
router.post('/loginServer', loginServer);

router.get('/getServer/:companyId', getServers)
// Add server endpoint
router.post('/addServer', addServer);

// Delete server endpoint
router.delete('/deleteServer/:serverId', deleteServer);

router.get('/server-details/:serverId', getCompanyDetails)


module.exports = router;
