const Customer = require('../models/customer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { StatusCodes } = require('http-status-codes');
const BadRequest = require('../Errors/BadRequest');
const { generateRandomString } = require('../utils/generateRandomString');
const mongoose = require('mongoose')
const Company = require('../models/company')


const registerCustomer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction()
    try {
        const { email, password } = req.body;

        console.log('email',email)

        // Check if customer with the provided email already exists
        let customer = await Customer.findOne({ 'email': email });
        if (customer) {
            throw new BadRequest('Customer already exists')
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        let randomString = generateRandomString(5); 
        let _username = email.split('@')[0];
        _username = _username + randomString;

        // Create new customer with all fields
       const newCustomer = await Customer.create({
            username:_username,
            email,
            password: hashedPassword
        },{session});

        const payload = {
            customer: {
                id: newCustomer[0]._id
            }
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Save the customer to the database
        res.status(StatusCodes.CREATED).json({token:token});
    } catch (error) {
       await session.abortTransaction();
       throw error;
    } finally {
        session.endSession()
    }
};

const loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the customer by email
        const customer = await Customer.findOne({ email });
        
        if (!customer) {
            throw new BadRequest('Invalid credentials');
        }

        // Check if the password matches the hashed password
        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) {
            throw new BadRequest('Invalid credentials');
        }

        // Create JWT payload
        const payload = {
            customer: {
                id: customer._id
            }
        };

        // Sign the JWT token
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Remove password from customer object before returning
        const { password: _, ...customerData } = customer.toObject(); // Convert mongoose document to plain object and exclude password

        // Return token and customer data without password
        res.status(StatusCodes.OK).json({ token: token, customer: customerData });
        
    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};


module.exports = {
    registerCustomer,
    loginCustomer
};
