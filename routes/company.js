const express = require('express');
const router = express.Router();
const {   
    registerCompany,
    loginCompany,
    getAllCompanies,
    getScannedCompanies
 } = require('../controllers/adminstration');

// Register route for customers
router.post('/admin/register', registerCompany);

router.get('/getAll',getAllCompanies)

router.get('/get-scanned-company/:companyId', getScannedCompanies)
// Login route for customers
router.post('/admin/login', loginCompany);

module.exports = router;
