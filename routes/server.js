const express = require('express');
const router = express.Router();
const { loginServer, addServer, deleteServer, getServers,getCompanyDetails } = require('../controllers/server');

router.get('/server-details/:serverId', getCompanyDetails)

// Get all servers endpoint
router.post('/loginServer', loginServer);

router.get('/getServer/:companyId', getServers)
// Add server endpoint
router.post('/addServer', addServer);

// Delete server endpoint
router.delete('/deleteServer/:serverId', deleteServer);



module.exports = router;
