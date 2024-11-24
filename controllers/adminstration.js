const Company = require('../models/company');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const BadRequest = require('../Errors/BadRequest');

const registerCompany = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { email, password } = req.body;
        let companyExist = await Company.findOne({ email });

        if (companyExist) {
            throw new BadRequest('Company already exists');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Company.create([{ email, password: hashedPassword }], { session });

        await session.commitTransaction();

        res.status(StatusCodes.CREATED).json({ message: 'Registration was successful' });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const loginCompany = async (req, res) => {
    try {
        const { email, password } = req.body;
        const company = await Company.findOne({ email });
        if (!company) {
            throw new BadRequest('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(password, company.password);
        if (!isMatch) {
            throw new BadRequest('Invalid credentials');
        }

        const payload = {
            company: { id: company._id },
        };

        jwt.sign(payload, 'your_jwt_secret', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, id: company._id });
        });
    } catch (error) {
        throw error;
    }
};

const getScannedCompanies = async (req, res) => {
    const { companyId } = req.params;
    try {
        const companies = await Company.findById(companyId);
        if (!companies) throw new BadRequest('There is no such company');
        res.status(StatusCodes.OK).json(companies);
    } catch (error) {
        throw error;
    }
};

const getCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const companies = await Company.findById(id);
        res.status(StatusCodes.OK).json(companies);
    } catch (error) {
        throw error;
    }
};

const updateCompanyInformation = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    const { _id, name, address, phone } = req.body;

    try {
        const companyExist = await Company.findById(_id);
        if (!companyExist) {
            throw new BadRequest('Company does not exist');
        }

        let updateData = {};
        if (name) updateData.name = name;
        if (address) updateData.address = address;
        if (phone) updateData.phone = phone;

        const updatedCompany = await Company.findByIdAndUpdate(
            _id,
            updateData,
            { new: true, session }
        );

        await session.commitTransaction();

        res.status(StatusCodes.OK).json(updatedCompany);
    } catch (error) {
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
    updateCompanyInformation,
};
