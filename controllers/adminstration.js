const Company = require('../models/company');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');
const {StatusCodes} = require('http-status-codes');
const BadRequest = require('../Errors/BadRequest');


const registerCompany = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction()

    try {
        const { name, address, email, phone, password } = req.body;
        let company = await Company.findOne({ name:name });
        if (company) {
            throw new BadRequest('Company already exists')
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Company.create([{
            name,
            address,
            email, 
            phone,
            password: hashedPassword
        }],{session});

        await session.commitTransaction();

        // Save the company to the database
        res.status(StatusCodes.CREATED).json({ message: 'Company registered successfully' });
    } catch (error) {
        await session.abortTransaction();
        throw error
    } finally {
        session.endSession()
    }
};



const loginCompany = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find the company by email
        const company = await Company.findOne({ email });
        if (!company) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if the password matches the hashed password
        const isMatch = await bcrypt.compare(password, company.password);
        if (!isMatch) {
            throw new BadRequest('Invalid credentials')
        }

        // Create JWT payload
        const payload = {
            company: {
                id: company._id
            }
        };
        // Sign the JWT token
        jwt.sign(payload, 'your_jwt_secret', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (error) {
        throw error;
    }
};


const getAllCompanies = async(req,res)=>{
        try {
            const companies = await Company.find(); // Fetch all companies
            res.status(StatusCodes.OK).json(companies); // Send the companies as a response
        } catch (error) {
            throw error;
       }
}

module.exports = {
    registerCompany,
    loginCompany,
    getAllCompanies
};
