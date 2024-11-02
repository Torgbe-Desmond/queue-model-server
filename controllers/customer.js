const Customer = require('../models/customer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { StatusCodes } = require('http-status-codes');
const BadRequest = require('../Errors/BadRequest');
const { generateRandomString } = require('../utils/generateRandomString');
const mongoose = require('mongoose')
const {  updateImage } = require('../utils/firebaseInteractions');
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

        const { password: _, ...customerData } = newCustomer.toObject(); 

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
        const { password: _, ...customerData } = customer.toObject(); 

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
        let responseObject = {};

        // Find the customer
        const userData = await Customer.findById(user_id);
        if (!userData) {
            throw new BadRequest('User not found, please try again');
        }

        // Update username if newUsername is provided
        if (newUsername) {
            const updatedUser = await Customer.findByIdAndUpdate(
                user_id,
                { username: newUsername },
                { new: true, session }
            );
            responseObject.newUsername = updatedUser.username;
        }

        // Handle file update or creation if a file is uploaded
        if (req.file) {
            const { size, mimetype } = req.file;
            const fileUrl = await updateImage(user_id, req.file, user_id); 

            if (fileId && mongoose.Types.ObjectId.isValid(fileId)) {
                // Update existing file document
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
                // Create a new file document if fileId is not valid or not provided
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

                // Save the newly created file ID to the user
                userData.image = newFileObject[0]._id; 
                await userData.save({ session }); 
                responseObject.newFile = newFileObject[0];
            }
        }

        // Commit transaction and respond with updated data
        await session.commitTransaction();
        res.status(StatusCodes.OK).json(responseObject);

    } catch (error) {
        await session.abortTransaction();
        console.error('Error occurred while editing customer:', error);
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

