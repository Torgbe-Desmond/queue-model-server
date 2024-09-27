const express = require('express');
const router = express.Router();
const {   registerCompany,
    loginCompany,getAllCompanies } = require('../controllers/adminstration');

// Register route for customers
router.post('/admin/register', registerCompany);

router.get('/getAll',getAllCompanies)
// Login route for customers
router.post('/admin/login', loginCompany);

module.exports = router;
