// Import required modules and configurations
const firebase = require('firebase/app'); // Firebase app initialization
require('dotenv').config(); // Load environment variables from .env file
const {
    getStorage, // Function to get the storage service
    ref, // Function to create a reference to a storage location
    getDownloadURL, // Function to get the download URL of a file
    uploadBytesResumable, // Function for uploading files with resumable support
    deleteObject, // Function to delete a file from storage
} = require('firebase/storage');


// Initialize Firebase with the provided configuration
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
const storage = getStorage(); // Get the storage service



const uploadFileToStorage = async (user_id, file, originalname) => {
    try {
        console.log('Uploading to storage');
        const { mimetype, buffer } = file;
        const storageRef = ref(storage, `customers/${user_id}/${originalname}`);
        const metadata = { contentType: mimetype };

        // Upload the file with resumable upload
        await uploadBytesResumable(storageRef, buffer, metadata);

        // Get the download URL for the uploaded file
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error; 
    }
};

const updateImage = async (user_id, file, originalname) => {
    try {
        const storageRef = ref(storage, `customers/${user_id}/${originalname}`);
        // Check if the file exists by attempting to delete it
        try {
            await deleteObject(storageRef);
            console.log('Existing file deleted successfully');
        } catch (deleteError) {
            if (deleteError.code === 'storage/object-not-found') {
                console.log('No existing file to delete, proceeding with upload');
            } else {
                console.error('Error deleting existing file:', deleteError);
                throw deleteError; // Re-throw if it's an unexpected error
            }
        }

        // Upload the new file
        return await uploadFileToStorage(user_id, file, originalname);
    } catch (error) {
        console.error('Error updating image:', error);
        throw error; 
    }
};

module.exports = { uploadFileToStorage,updateImage }