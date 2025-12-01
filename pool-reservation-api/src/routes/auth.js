// src/routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Database connection
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth'); // Renter auth middleware
const crypto = require('crypto');
const { sendEmailNotification } = require('../services/notificationService');

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

/**
 * @route GET /api/auth/me
 * @description Get current logged in user's profile
 * @access Private
 */
router.get('/me', auth, async (req, res) => {
    try {
        let users;
        try {
            [users] = await db.query(
                'SELECT user_id, fName, lName, email, role, is_active, max_guests, created_at FROM users WHERE user_id = ?',
                [req.user.id]
            );
        } catch (queryError) {
            // Fallback if max_guests column doesn't exist
            if (queryError.code === 'ER_BAD_FIELD_ERROR') {
                [users] = await db.query(
                    'SELECT user_id, fName, lName, email, role, is_active, NULL as max_guests, created_at FROM users WHERE user_id = ?',
                    [req.user.id]
                );
            } else {
                throw queryError;
            }
        }

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = users[0];
        res.json({
            id: user.user_id,
            fName: user.fName,
            lName: user.lName,
            email: user.email,
            role: user.role,
            isActive: user.is_active,
            maxGuests: user.max_guests,
            createdAt: user.created_at
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error while fetching profile.' });
    }
});

/**
 * @route PUT /api/auth/profile
 * @description Update current user's profile (first name, last name, password)
 * @access Private
 */
router.put('/profile', auth, async (req, res) => {
    const { fName, lName, currentPassword, newPassword } = req.body;

    try {
        // Get current user
        const [users] = await db.query(
            'SELECT user_id, fName, lName, password FROM users WHERE user_id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = users[0];
        let updates = [];
        let values = [];

        // Update first name if provided
        if (fName && fName.trim()) {
            updates.push('fName = ?');
            values.push(fName.trim());
        }

        // Update last name if provided
        if (lName && lName.trim()) {
            updates.push('lName = ?');
            values.push(lName.trim());
        }

        // Update password if provided
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to change password.' });
            }

            // Verify current password
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Current password is incorrect.' });
            }

            // Validate new password length
            if (newPassword.length < 6) {
                return res.status(400).json({ message: 'New password must be at least 6 characters.' });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            updates.push('password = ?');
            values.push(hashedPassword);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No valid fields to update.' });
        }

        // Build and execute update query
        values.push(req.user.id);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`;
        await db.query(sql, values);

        // Fetch updated user data
        const [updatedUsers] = await db.query(
            'SELECT user_id, fName, lName, email, role FROM users WHERE user_id = ?',
            [req.user.id]
        );

        res.json({
            message: 'Profile updated successfully.',
            user: {
                id: updatedUsers[0].user_id,
                fName: updatedUsers[0].fName,
                lName: updatedUsers[0].lName,
                email: updatedUsers[0].email,
                role: updatedUsers[0].role
            }
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error while updating profile.' });
    }
});

/**
 * @route POST /api/auth/forgot-password
 * @description Request a password reset email
 * @access Public
 */
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Please provide your email address.' });
    }

    try {
        // 1. Find user by email
        const [users] = await db.query('SELECT user_id, fName, email FROM users WHERE email = ?', [email]);

        // Always return success message to prevent email enumeration
        if (users.length === 0) {
            return res.json({ 
                message: 'If an account with that email exists, a password reset link has been sent.' 
            });
        }

        const user = users[0];

        // 2. Generate a secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // 3. Store the hashed token in database
        await db.query(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE user_id = ?',
            [resetTokenHash, resetTokenExpiry, user.user_id]
        );

        // 4. Send password reset email
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
        const emailSubject = '🔐 Password Reset Request - Luxuria Bacaca Resort';
        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">Password Reset Request</h1>
                <p>Dear ${user.fName},</p>
                <p>We received a request to reset your password for your Luxuria Bacaca Resort account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px;">${resetUrl}</p>
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;"><strong>⚠️ Important:</strong> This link will expire in 1 hour.</p>
                </div>
                <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px;">Luxuria Bacaca Resort - Pool Reservation System</p>
            </div>
        `;
        
        await sendEmailNotification(user.email, emailSubject, emailContent);

        res.json({ 
            message: 'If an account with that email exists, a password reset link has been sent.' 
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});

/**
 * @route POST /api/auth/reset-password
 * @description Reset password with token
 * @access Public
 */
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    try {
        // 1. Hash the provided token to compare with stored hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // 2. Find user with matching token that hasn't expired
        const [users] = await db.query(
            'SELECT user_id, fName, email FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
            [tokenHash]
        );

        if (users.length === 0) {
            return res.status(400).json({ 
                message: 'Invalid or expired reset token. Please request a new password reset.' 
            });
        }

        const user = users[0];

        // 3. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 4. Update password and clear reset token
        await db.query(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = ?',
            [hashedPassword, user.user_id]
        );

        // 5. Send confirmation email
        const emailSubject = '✅ Password Reset Successful - Luxuria Bacaca Resort';
        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #22c55e; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">Password Reset Successful</h1>
                <p>Dear ${user.fName},</p>
                <p>Your password has been successfully reset.</p>
                <p>You can now log in to your account with your new password.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Login to Your Account
                    </a>
                </div>
                <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
                    <p style="margin: 0; color: #991b1b;"><strong>🚨 Security Alert:</strong> If you did not make this change, please contact us immediately.</p>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px;">Luxuria Bacaca Resort - Pool Reservation System</p>
            </div>
        `;
        
        await sendEmailNotification(user.email, emailSubject, emailContent);

        res.json({ message: 'Password has been reset successfully. You can now log in.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});


module.exports = router;