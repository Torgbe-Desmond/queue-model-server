const express = require('express');
const router = express.Router();
const { registerCustomer, loginCustomer, editCustomer } = require('../controllers/customer');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Register route for customers
router.post('/auth/customer/register', registerCustomer);

// Login route for customers
router.post('/auth/customer/login', loginCustomer);

// Update route for customers
router.post('/update', upload.single('profileImage'), editCustomer)

module.exports = router;
