const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const authenticate = (req, res, next) => {
    try {
        const token = req.header('Authorization');
        if (!token) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        User.findById(decoded.userId).then(user => {
            if (!user) {
                throw new Error('User not found');
            }
            req.user = user;
            next();
        }).catch(err => {
            return res.status(401).json({ success: false, message: "User not found" });
        });

    } catch (err) {
        console.log(err);
        return res.status(401).json({ success: false, message: "Invalid Token" });
    }
}

module.exports = { authenticate };
