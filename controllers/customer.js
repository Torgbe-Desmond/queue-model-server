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
        const { newUsername, user_id, fileId } = req.body;
        let updatedName, newFileObject, responseObject = {};

        const userData = await Customer.findById(user_id);
        if (!userData) {
            throw new BadRequest('User not found, please try again');
        }

        // Update username if newUsername is provided
        if (newUsername) {
            updatedName = await Customer.findByIdAndUpdate(
                user_id,
                { username: newUsername },
                { new: true, session }
            );
            responseObject.newUsername = updatedName.username;
        }

        // Handle file update or creation if a file is uploaded
        if (req.file) {
            const { size, mimetype } = req.file;
            const fileUrl = await updateImage(user_id, req.file, user_id);

            if (fileId && mongoose.Types.ObjectId.isValid(fileId)) {
                // Update existing file document
                newFileObject = await File.findByIdAndUpdate(
                    fileId,
                    {
                        url: fileUrl,
                        originalname: updatedName ? updatedName.username : userData.username,
                        size,
                        user_id,
                        mimetype,
                    },
                    { new: true, session }
                );
            } else {
                // Create a new file document
                newFileObject = await File.create(
                    [{ originalname: updatedName ? updatedName.username : userData.username, size, url: fileUrl, mimetype,user_id }],
                    { session }
                );
                newFileObject = newFileObject[0]; // Ensure it’s a single document in response
            }
            
            responseObject.updatedFile = newFileObject;
        }


        console.log('responseObject',responseObject)

        // Commit transaction and respond with updated data
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
// file, File, user_id, uploadFile, session

// '66fc98131f042d09cc636584'