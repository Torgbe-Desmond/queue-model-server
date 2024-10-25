const express = require('express');
const { createScanHistory, getAllScanHistories,deleteScanHistory } = require('../controllers/history');
const router = express.Router();


router.post('/scan-history',createScanHistory )
router.get('/get-user-history/:id', getAllScanHistories )
router.delete('/delete-history/:historyId',deleteScanHistory)
module.exports = router;   