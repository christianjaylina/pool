// src/middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Middleware function to verify JWT from the request header.
 * Attaches the decoded user payload (user_id and role) to the request object (req.user).
 * Used for Renter routes.
 */
const auth = (req, res, next) => {
    // 1. Get the token from the header
    // The client should send the token in the format: "Bearer <token>"
    const token = req.header('x-auth-token');

    // 2. Check if no token is present
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied.' });
    }

    try {
        // 3. Verify the token
        // This checks if the token is valid (signed with our secret) and not expired.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Attach the user payload to the request object
        // The payload contains { user: { id: 1, role: 'renter' } }
        req.user = decoded.user;
        
        // 5. Proceed to the next middleware or the route handler
        next();

    } catch (error) {
        // Handles cases where the token is expired or invalid
        console.error('JWT verification failed:', error.message);
        res.status(401).json({ message: 'Token is not valid.' });
    }
};

module.exports = auth;