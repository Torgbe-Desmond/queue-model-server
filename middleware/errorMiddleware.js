const { StatusCodes } = require('http-status-codes')
const custom_error_handler = require('../Errors/custom-error-handler')

const errorMiddleware = (err,req,res,next)=>{
  
       
        createCustomError = {
            message : err.message || 'INTERNAL SERVER ERROR',
            statusCode : err.statusCodes || StatusCodes.INTERNAL_SERVER_ERROR
        }
    
        if(err.name =='TokenExpiredError'){
            createCustomError.message = 'Your Session has expired'
        }
        
        if(err.name=="JsonWebTokenError"){
            createCustomError.message = 'Your token is invalid'
        }

        console.log('error message',err.message)
        res.status(createCustomError.statusCode).json({message:err.message})

}


module.exports = errorMiddleware;