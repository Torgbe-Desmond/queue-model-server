const Customer = require('../models/customer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { StatusCodes } = require('http-status-codes');
const BadRequest = require('../Errors/BadRequest');
const { generateRandomString } = require('../utils/generateRandomString');
const mongoose = require('mongoose');
const { updateImage } = require('../utils/firebaseInteractions');
const File = require('../models/imageFile');

const registerCustomer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { email, password } = req.body;

        let customer = await Customer.findOne({ 'email': email });
        if (customer) {
            throw new BadRequest('Customer already exists');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let randomString = generateRandomString(5);
        let _username = email.split('@')[0];
        _username = _username + randomString;

        const newCustomer = await Customer.create({
            username: _username,
            email,
            password: hashedPassword
        }, { session });

        const payload = {
            customer: {
                id: newCustomer[0]._id
            }
        };

        const { password: _, ...customerData } = newCustomer.toObject();

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(StatusCodes.CREATED).json({ token: token, customer: customerData });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;
        const customer = await Customer.findOne({ email }).populate('history').populate('image');

        if (!customer) {
            throw new BadRequest('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) {
            throw new BadRequest('Invalid credentials');
        }

        const payload = {
            customer: {
                id: customer._id
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        const { password: _, ...customerData } = customer.toObject();

        res.status(StatusCodes.OK).json({ token: token, customer: customerData });

    } catch (error) {
        throw error;
    }
};

const editCustomer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { newUsername, user_id, fileId } = req.body;
        let responseObject = {};

        const userData = await Customer.findById(user_id);
        if (!userData) {
            throw new BadRequest('User not found, please try again');
        }

        if (newUsername) {
            const updatedUser = await Customer.findByIdAndUpdate(
                user_id,
                { username: newUsername },
                { new: true, session }
            );
            responseObject.newUsername = updatedUser.username;
        }

        if (req.file) {
            const { size, mimetype } = req.file;
            const fileUrl = await updateImage(user_id, req.file, user_id);

            if (fileId && mongoose.Types.ObjectId.isValid(fileId)) {
                const updatedFile = await File.findByIdAndUpdate(
                    fileId,
                    {
                        url: fileUrl,
                        originalname: newUsername || userData.username,
                        size,
                        user_id,
                        mimetype,
                    },
                    { new: true, session }
                );
                responseObject.updatedFile = updatedFile;
            } else {
                const newFileObject = await File.create(
                    [{
                        originalname: newUsername || userData.username,
                        size,
                        url: fileUrl,
                        mimetype,
                        user_id,
                    }],
                    { session }
                );

                userData.image = newFileObject[0]._id;
                await userData.save({ session });
                responseObject.newFile = newFileObject[0];
            }
        }

        await session.commitTransaction();
        res.status(StatusCodes.OK).json(responseObject);

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

module.exports = {
    registerCustomer,
    loginCustomer,
    editCustomer
};
