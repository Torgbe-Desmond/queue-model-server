const custom_error_handler = require('./custom-error-handler')
const {StatusCodes} = require('http-status-codes')

class Unauthorized extends custom_error_handler{
    constructor(message){
        super(message)
        this.messaeg = message
        this.statusCodes = StatusCodes.UNAUTHORIZED
    }
}


module.exports = Unauthorized