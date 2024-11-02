const express = require('express');
const router = express.Router();
const {   
    registerCompany,
    loginCompany,
    getCompany,
    getScannedCompanies,
    updateCompanyInformation,
 } = require('../controllers/adminstration');


router.post('/admin/register', registerCompany);

router.get('/get-company/:id',getCompany)

router.get('/get-scanned-company/:companyId', getScannedCompanies)

router.post('/admin/login', loginCompany);

router.post('/update-company', updateCompanyInformation)

module.exports = router;
