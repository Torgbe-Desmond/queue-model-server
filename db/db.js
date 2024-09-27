const mongoose = require('mongoose');

// Connect to MongoDB
const connectMongoDB = async (url) => {
    await mongoose.connect(url);
};

module.exports = {
    connectMongoDB,
};
