const express = require('express');
const router = express.Router();
const { registerCustomer, loginCustomer, editCustomer } = require('../controllers/customer');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/auth/customer/register', registerCustomer);

router.post('/auth/customer/login', loginCustomer);

router.post('/update', upload.single('profileImage'), editCustomer)

module.exports = router;
