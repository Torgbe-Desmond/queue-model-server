  require("dotenv").config();
  const { app, server, express } = require("./socket/socket.js");
  require('express-async-errors')
  const cors =  require('cors');
  const { connectMongoDB } = require("./db/db.js");

  const PORT = process.env.PORT || 4000;

  app.use(express.json());
  app.use(cors())



  //auth route
  app.use('/api/v1', require('./routes/company.js'));
  app.use('/api/v1', require('./routes/customer.js'));
  app.use('/api/v1',require('./routes/server.js'))


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
