// Import required modules and configurations
const firebase = require('firebase/app'); // Firebase app initialization
const admin = require("firebase-admin"); // Firebase Admin SDK for server-side operations
require('dotenv').config(); // Load environment variables from .env file
const {
    getStorage, // Fun077777777777777777777777777777777777777777777777777777777777777777ction to get the storage service
    ref, // Function to create a reference to a storage location
    getDownloadURL, // Function to get the download URL of a file
    uploadBytesResumable, // Function for uploading files with resumable support
    deleteObject, // Function to delete a file from storage
    getBytes // Function to get the bytes of a file from storage
} = require('firebase/storage');



const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase app
firebase.initializeApp(firebaseConfig);
const storage = getStorage(); // Get the storage 



const uploadFileToStorage = async (user_id, file, originalname) => {
    try {
        console.log('inside to storage')
        const { mimetype, buffer } = file; // Destructure the file to get its mimetype and buffer
        const storageRef = ref(storage, `customers/${user_id}/${originalname}`); // Create a reference to the storage location
        const metadata = {
            contentType: mimetype // Set the content type for the uploaded file
        };
        // Upload the file with resumable upload
        await uploadBytesResumable(storageRef, buffer, metadata);
        // Get the download URL for the uploaded file
        const fileUrl = await getDownloadURL(storageRef);
        return fileUrl; // Return the download URL
    } catch (error) {
        console.log('inside to storage error')
        throw error; // Throw error if upload fails
    }
};


async function updateImage(user_id, file, originalname, newoOriginalname) {
    try {
        console.log('inside to update')

        const storageRef = ref(storage, `customers/${user_id}/${originalname}`); // Reference to the existing image

        // Delete the existing file before uploading the new one
        await deleteObject(storageRef);

        // Upload the new file and get the response (download URL)
        const uploadResponse = await uploadFileToStorage(user_id, file, newoOriginalname);
        console.log('inside to update end')

        return uploadResponse; // Return the new file's download URL
    } catch (error) {
        console.log('inside to update error')

        throw error; // Throw error if update fails
    }
};


module.exports = { uploadFileToStorage,updateImage }