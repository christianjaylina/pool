// src/middleware/adminAuth.js
const jwt = require('jsonwebtoken');

/**
 * Middleware function to ensure the user is an 'admin'.
 */
const adminAuth = (req, res, next) => {
    // 1. Get the token from the header (same logic as auth.js)
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied.' });
    }

    try {
        // 2. Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        // 3. CHECK THE ROLE
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
        }

        // 4. Proceed if admin
        next();

    } catch (error) {
        res.status(401).json({ message: 'Token is not valid.' });
    }
};

module.exports = adminAuth;