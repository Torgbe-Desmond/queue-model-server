const jwt = require('jsonwebtoken');
const { Unauthorized } = require('../Errors/index');
const Student = require('../models/student.model.js');

const studentProtectRoutes = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer')) {
            throw new Unauthorized('Unauthorized');
        }

        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_KEY);

        if (!decoded) {
            throw new Unauthorized('Unauthorized');
        }

        const student = await Student.findOne({ _id: decoded._id });

        if (!student) {
            throw new Unauthorized('Unauthorized');
        }

        req.user = student._id;
        next();
    } catch (error) {
        next(error);
    }
};



module.exports =studentProtectRoutes