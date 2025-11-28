// src/routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Database connection
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth'); // Renter auth middleware

// Route for Renter Registration
router.post('/register', async (req, res) => {
    const { fName, lName, email, password } = req.body;
    const role = 'renter'; // Default role is renter

    // Simple validation
    if (!fName || !lName || !email || !password) {
        return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    try {
        // 1. Check if user already exists
        const [existingUser] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
        
        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        // 2. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Insert the new user into the database
        const sql = `
            INSERT INTO users (fName, lName, email, password, role)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(sql, [fName, lName, email, hashedPassword, role]);

        // Success response
        res.status(201).json({
            message: 'Renter registered successfully!',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// src/routes/auth.js (Continuation)
const jwt = require('jsonwebtoken'); // Import jsonwebtoken

// Route for Renter and Admin Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter both email and password.' });
    }

    try {
        // 1. Find the user by email
        const [users] = await db.query('SELECT user_id, fName, password, role, is_active FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            // Use a generic error message for security (don't reveal if the email exists)
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        
        const user = users[0];

        // 2. Check if the renter account is active (Admin feature)
        if (user.role === 'renter' && !user.is_active) {
             return res.status(403).json({ message: 'Your account is currently inactive. Please contact administration.' });
        }

        // 3. Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // 4. Generate the JSON Web Token (JWT)
        // The token payload contains the minimum necessary data (user_id, role)
        const payload = {
            user: {
                id: user.user_id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET, // The secret key from your .env file
            { expiresIn: '1h' }, // Token expiration time
            (err, token) => {
                if (err) throw err;
                // 5. Send the token and basic user info back to the client
                res.json({ 
                    message: 'Login successful',
                    token,
                    user: {
                        id: user.user_id,
                        fName: user.fName,
                        role: user.role
                    }
                });
            }
        );

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


module.exports = router;