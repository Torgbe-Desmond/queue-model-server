const express = require('express');
const { createScanHistory, getAllScanHistories } = require('../controllers/history');
const router = express.Router();


router.post('/scan-history',createScanHistory )
router.get('/get-user-history/:id', getAllScanHistories )

module.exports = router;   