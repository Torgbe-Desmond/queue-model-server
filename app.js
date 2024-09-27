const express = require("express");
require("dotenv").config();
const { app, server } = require("./socket/socket.js");
require('dotenv').config()
require('express-async-errors')
const cors =  require('cors');
const { connectMongoDB } = require("./db/db.js");

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors())



//auth route
app.use('/api/v1/auth', require('./routes/company.js'));
// app.use('/api/v1/auth', require('./routes/company.js'));


//custom middleware

app.use(require('./middleware/notFound'))
app.use(require('./middleware/errorMiddleware'))

// console.clear()

const start = async () => {
    try {
      await connectMongoDB(process.env.MONGO_DB_URL);
      server.listen(PORT, () => {
        console.log(`App is running on port ${PORT}`);
      });
    } catch (error) {
      console.log(error);
    }
  };

start()

// console.clear()
