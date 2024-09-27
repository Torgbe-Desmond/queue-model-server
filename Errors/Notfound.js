const custom_error_handler = require('./custom-error-handler')
const {StatusCodes} = require('http-status-codes')

class NotFound extends custom_error_handler{
    constructor(message){
        super(message)
        this.messaeg = message
        this.statusCodes = StatusCodes.NOT_FOUND
    }
}

module.exports = NotFound