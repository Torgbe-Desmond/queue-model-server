const express = require('express');
const router = express.Router();
const {   
    registerCompany,
    loginCompany,
    getCompany,
    getScannedCompanies,
    updateCompanyInformation,
 } = require('../controllers/adminstration');
 const multer = require('multer');
 const storage = multer.memoryStorage();
 const upload = multer({ storage: storage });

// Register route for customers
router.post('/admin/register', registerCompany);

router.get('/get-company/:id',getCompany)

router.get('/get-scanned-company/:companyId', getScannedCompanies)
// Login route for customers
router.post('/admin/login', loginCompany);

router.post('/update-company', updateCompanyInformation)

module.exports = router;
