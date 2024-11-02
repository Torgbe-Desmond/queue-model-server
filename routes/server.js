const express = require('express');
const router = express.Router();
const { loginServer, addServer, deleteServer, getServers,getCompanyDetails } = require('../controllers/server');

router.get('/server-details/:serverId', getCompanyDetails)

router.post('/loginServer', loginServer);

router.get('/getServer/:companyId', getServers)

router.post('/addServer', addServer);

router.delete('/deleteServer/:serverId', deleteServer);

module.exports = router;
