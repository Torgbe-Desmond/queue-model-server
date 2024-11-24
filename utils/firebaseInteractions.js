const firebase = require('firebase/app'); 
require('dotenv').config();
const {
    getStorage, 
    ref, 
    getDownloadURL,
    uploadBytesResumable, 
    deleteObject, 
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

firebase.initializeApp(firebaseConfig);
const storage = getStorage(); 



const uploadFileToStorage = async (user_id, file, originalname) => {
    try {
        console.log('Uploading to storage');
        const { mimetype, buffer } = file;
        const storageRef = ref(storage, `customers/${user_id}/${originalname}`);
        const metadata = { contentType: mimetype };

        await uploadBytesResumable(storageRef, buffer, metadata);

        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error; 
    }
};

const updateImage = async (user_id, file, originalname) => {
    try {
        const storageRef = ref(storage, `customers/${user_id}/${originalname}`);
        try {
            await deleteObject(storageRef);
            console.log('Existing file deleted successfully');
        } catch (deleteError) {
            if (deleteError.code === 'storage/object-not-found') {
                console.log('No existing file to delete, proceeding with upload');
            } else {
                console.error('Error deleting existing file:', deleteError);
                throw deleteError;
            }
        }

        return await uploadFileToStorage(user_id, file, originalname);
    } catch (error) {
        console.error('Error updating image:', error);
        throw error; 
    }
};

module.exports = { uploadFileToStorage,updateImage }