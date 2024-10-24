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
        const { email, password } = req.body;
        let companyExist = await Company.findOne({ email });
        console.log('company',companyExist)
        if (companyExist) {
            throw new BadRequest('Company already exists')
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

       const company = await Company.create([{
            email, 
            password: hashedPassword
        }],{session});

        await session.commitTransaction();
      // Create JWT payload
        const payload = {
            company: {
                id: company[0]._id
            }
        };
        // Sign the JWT token
        jwt.sign(payload, 'your_jwt_secret', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token,id:company._id });
        });
        // Save the company to the database
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
            res.json({ token,id:company._id });
        });
    } catch (error) {
        throw error;
    }
};

const getScannedCompanies = async(req,res)=>{
    const { companyId} = req.params;
    try {
        const companies = await Company.findById(companyId); 
        console.log('companies',companies)
        if(!companies) throw new BadRequest('There is no such company')
        res.status(StatusCodes.OK).json(companies);
    } catch (error) {
        throw error;
   }
}


const getCompany = async(req,res)=>{
        try {
            const { id } = req.params
            const companies = await Company.findById(id); // Fetch all companies
            res.status(StatusCodes.OK).json(companies); // Send the companies as a response
        } catch (error) {
            throw error;
       }
}


const updateCompanyInformation = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    const { _id, name, address, phone } = req.body;
    console.log(_id, name, address, phone)
    // const profileImage = req.file;  // Multer stores the file here
    // console.log(req.file)

    try {
        // Check if the company exists
        const companyExist = await Company.findById(_id);
        if (!companyExist) {
            throw new BadRequest('Company does not exist');
        }

        let updateData = {};

        if(name){
            updateData.name = name;
        }

        if(address){
            updateData.address = address;
        }

        if(phone){
            updateData.phone = phone;
        }
    
        // Update the company information
        const updatedCompany = await Company.findByIdAndUpdate(
            _id,
            updateData,
            { new: true, session } // Return the updated document with { new: true }
        );

        // Commit the transaction
        await session.commitTransaction();

        // Send updated company info in response
        res.status(StatusCodes.OK).json(updatedCompany);

    } catch (error) {
        // Abort transaction if there's an error
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};


module.exports = {
    registerCompany,
    loginCompany,
    getCompany,
    getScannedCompanies,
    updateCompanyInformation
};
