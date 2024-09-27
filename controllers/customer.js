const Customer = require('../models/customer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


const registerCustomer = async (req, res) => {
    try {
        const { name, address, email, phone, password } = req.body;

        // Check if customer with the provided email already exists
        let customer = await Customer.findOne({ 'contact.email': email });
        if (customer) {
            return res.status(400).json({ message: 'Customer already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new customer with all fields
        customer = new Customer({
            name,
            address,
            contact: {
                email,
                phone
            },
            password: hashedPassword
        });

        // Save the customer to the database
        await customer.save();
        res.status(201).json({ message: 'Customer registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


const loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find the customer by email
        const customer = await Customer.findOne({ email });
        if (!customer) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Check if the password matches the hashed password
        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Create JWT payload
        const payload = {
            customer: {
                id: customer._id
            }
        };

        // Sign the JWT token
        jwt.sign(payload, 'your_jwt_secret', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    registerCustomer,
    loginCustomer
};
