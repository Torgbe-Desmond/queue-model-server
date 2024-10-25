const Customer = require('../models/customer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { StatusCodes } = require('http-status-codes');
const BadRequest = require('../Errors/BadRequest');
const { generateRandomString } = require('../utils/generateRandomString');
const mongoose = require('mongoose')
const Company = require('../models/company')
const HandleFileCreationHandler = require('../utils/handleFileCreation');
const { uploadFileToStorage, updateImage } = require('../utils/firebaseInteractions');
const createFile = new HandleFileCreationHandler();
const File = require('../models/imageFile')


const registerCustomer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction()
    try {
        const { email, password } = req.body;
        console.log('register email',email)

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

        const { password: _, ...customerData } = newCustomer.toObject(); // Convert mongoose document to plain object and exclude password

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Save the customer to the database
        res.status(StatusCodes.CREATED).json({token:token, customer:customerData});
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
        const customer = await Customer.findOne({ email }).populate('history').populate('image');
        
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

const editCustomer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { newUsername, user_id, originalname: fileOriginalname, fileId } = req.body;
        let updatedFile, newFileObject, noFileUpdates, responseObject = {}, customerObject = {};

        // Update username if provided
        if (newUsername) {
            customerObject.username = newUsername;
        }

        // Check if the user exists
        const userData = await Customer.findById(user_id);
        if (!userData) {
            throw new BadRequest('User not found, please try again');
        }

        // Update the username in the database
        const updatedUser = await Customer.findByIdAndUpdate(
            user_id,
            { ...customerObject },
            { new: true, session }
        );

        // If no new file is uploaded, use the existing file
        if (updatedUser && !req.file) {
            noFileUpdates = await File.findById(fileId);
        }

        // If a file is uploaded, update or create a new file entry
        if (req.file) {
            const { originalname, mimetype, size } = req.file;

            const existingFile = await File.findById(fileId);
            if (existingFile || !existingFile) {
                // Update existing file details
                updatedFile = await File.findByIdAndUpdate(
                    fileId,
                    { originalname, mimetype, size },
                    { new: true, session }
                );

                // Update file URL in storage (ensure `updateImage` is well implemented)
                const fileUrl = await updateImage(
                    user_id,
                    req.file,
                    updatedFile.originalname
                );
                updatedFile.url = fileUrl;
                await updatedFile.save();
            }
        }

        // Build the response object based on the changes made
         if (updatedFile) {
            responseObject = { newUsername: updatedUser.username, updatedFile };
        } else if (noFileUpdates) {
            responseObject = { newUsername: updatedUser.username, updatedFile: noFileUpdates };
        }

        console.log('responseObject',responseObject)

        await session.commitTransaction();
        res.status(StatusCodes.OK).json(responseObject);

    } catch (error) {
        await session.abortTransaction();
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

module.exports = {
    registerCustomer,
    loginCustomer,
    editCustomer
};
// file, File, user_id, uploadFile, session

// '66fc98131f042d09cc636584'