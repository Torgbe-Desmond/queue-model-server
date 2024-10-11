const express = require('express');
const router = express.Router();
const { registerCustomer, loginCustomer } = require('../controllers/customer');

// Register route for customers
router.post('/auth/customer/register', registerCustomer);

// Login route for customers
router.post('/auth/customer/login', loginCustomer);

module.exports = router;
