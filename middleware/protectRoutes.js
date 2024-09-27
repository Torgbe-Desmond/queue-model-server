const jwt = require('jsonwebtoken');
const { Unauthorized } = require('../Errors/index');
const User = require('../models/user.model')

const protectRoutes = async (req, res, next) => {

    try {

        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer')){
            throw new Unauthorized('Unauthorized');
        }

        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_KEY);

        if (!decoded._id){
            throw new Unauthorized('Unauthorized');
        }

        const user = await User.findOne({_id:decoded._id})

        console.log('user',user)
          
        if (!user){
            throw new Unauthorized('Unauthorized');
        }

        const _id = user._id
        req.user = _id

        next();
    }
     
    catch (error){
        next(error); 
    }
};

module.exports = protectRoutes;
