class custom_error_handler extends Error{
    constructor(message){
        super(message)
        this.message = message
    }
}


module.exports = custom_error_handler