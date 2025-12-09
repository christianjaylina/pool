// src/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const adminAuth = require('../middleware/adminAuth'); // Only Admins can manage users
const { logAdminAction } = require('../services/logService'); // For auditing

/**
 * @route GET /api/users/admin/renters
 * @description Admin views all user accounts with the 'renter' role.
 * @access Private (Admin)
 */
router.get('/admin/renters', adminAuth, async (req, res) => {
    try {
        let renters;
        try {
            const sql = `
                SELECT 
                    user_id,
                    fName,
                    lName,
                    email,
                    is_active,
                    max_guests,
                    created_at
                FROM users
                WHERE role = 'renter'
                ORDER BY lName ASC;
            `;
            [renters] = await db.query(sql);
        } catch (queryError) {
            // Fallback if max_guests column doesn't exist
            if (queryError.code === 'ER_BAD_FIELD_ERROR') {
                const sql = `
                    SELECT 
                        user_id,
                        fName,
                        lName,
                        email,
                        is_active,
                        NULL as max_guests,
                        created_at
                    FROM users
                    WHERE role = 'renter'
                    ORDER BY lName ASC;
                `;
                [renters] = await db.query(sql);
            } else {
                throw queryError;
            }
        }

        res.json(renters);
    } catch (error) {
        console.error('Error fetching all renters:', error);
        res.status(500).json({ message: 'Server error while fetching renter list.' });
    }
});

/**
 * @route PUT /api/users/admin/max-guests/:id
 * @description Admin sets the maximum guests allowed for a user's reservations.
 * @access Private (Admin)
 */
router.put('/admin/max-guests/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { maxGuests } = req.body;

    // Input validation
    if (maxGuests !== null && (typeof maxGuests !== 'number' || maxGuests < 1)) {
        return res.status(400).json({ message: 'maxGuests must be a positive number or null (unlimited).' });
    }

    try {
        // 1. Ensure the target user exists and is a RENTER
        const [user] = await db.query('SELECT fName, lName, role FROM users WHERE user_id = ?', [id]);
        
        if (user.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        if (user[0].role !== 'renter') {
            return res.status(403).json({ message: 'Cannot modify non-renter accounts.' });
        }

        // 2. Update the max_guests in the database
        try {
            await db.query('UPDATE users SET max_guests = ? WHERE user_id = ?', [maxGuests, id]);
        } catch (updateError) {
            // If column doesn't exist, create it first
            if (updateError.code === 'ER_BAD_FIELD_ERROR') {
                await db.query('ALTER TABLE users ADD COLUMN max_guests INT DEFAULT NULL');
                await db.query('UPDATE users SET max_guests = ? WHERE user_id = ?', [maxGuests, id]);
            } else {
                throw updateError;
            }
        }

        // 3. Log the Admin action
        const limitText = maxGuests ? `${maxGuests} guests` : 'unlimited';
        const adminAction = `set max guests limit to ${limitText} for ${user[0].fName} ${user[0].lName}.`;
        await logAdminAction(req.user.id, adminAction);

        res.json({
            message: `Max guests limit updated successfully.`,
            userId: parseInt(id),
            maxGuests: maxGuests
        });

    } catch (error) {
        console.error('Error updating max guests:', error);
        res.status(500).json({ message: 'Server error while updating max guests limit.' });
    }
});

/**
 * @route PUT /api/users/admin/status/:id
 * @description Admin activates or deactivates a renter's account by ID.
 * @access Private (Admin)
 */
router.put('/admin/status/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body; // Expected boolean value (true or false)

    // Input validation
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'Invalid value provided for isActive. Must be true or false.' });
    }

    try {
        // 1. Ensure the target user exists and is a RENTER
        const [user] = await db.query('SELECT role, fName, lName FROM users WHERE user_id = ?', [id]);
        
        if (user.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        if (user[0].role !== 'renter') {
            return res.status(403).json({ message: 'Cannot modify non-renter accounts (Admins).' });
        }

        // 2. Update the is_active status in the database
        const newStatus = isActive ? 1 : 0; // Convert boolean to MySQL tinyint
        
        await db.query('UPDATE users SET is_active = ? WHERE user_id = ?', [newStatus, id]);

        // 3. Log the Admin action
        const action = isActive ? 'activated' : 'deactivated';
        const adminAction = `${action} renter account: ${user[0].fName} ${user[0].lName}.`;
        await logAdminAction(req.user.id, adminAction);

        res.json({
            message: `Renter account ID ${id} successfully ${action}.`,
            userId: id,
            isActive: isActive
        });

    } catch (error) {
        console.error('Error updating renter status:', error);
        res.status(500).json({ message: 'Server error while updating renter status.' });
    }
});

/**
 * @route PUT /api/users/admin/update/:id
 * @description Admin updates a renter's account information (name, email).
 * @access Private (Admin)
 */
router.put('/admin/update/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { fName, lName, email } = req.body;

    // Input validation
    if (!fName && !lName && !email) {
        return res.status(400).json({ message: 'At least one field (fName, lName, or email) must be provided.' });
    }

    // Email format validation
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }
    }

    try {
        // 1. Ensure the target user exists and is a RENTER
        const [user] = await db.query('SELECT fName, lName, email, role FROM users WHERE user_id = ?', [id]);
        
        if (user.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        if (user[0].role !== 'renter') {
            return res.status(403).json({ message: 'Cannot modify non-renter accounts.' });
        }

        const oldUser = user[0];

        // 2. If email is being changed, check if the new email already exists
        if (email && email !== oldUser.email) {
            const [existingEmail] = await db.query('SELECT user_id FROM users WHERE email = ? AND user_id != ?', [email, id]);
            if (existingEmail.length > 0) {
                return res.status(409).json({ message: 'This email address is already in use by another account.' });
            }
        }

        // 3. Build the update query dynamically
        const updates = [];
        const values = [];
        
        if (fName) {
            updates.push('fName = ?');
            values.push(fName);
        }
        if (lName) {
            updates.push('lName = ?');
            values.push(lName);
        }
        if (email) {
            updates.push('email = ?');
            values.push(email);
        }
        
        values.push(id);
        
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, values);

        // 4. Log the Admin action with details of what changed
        const changes = [];
        if (fName && fName !== oldUser.fName) changes.push(`first name: "${oldUser.fName}" → "${fName}"`);
        if (lName && lName !== oldUser.lName) changes.push(`last name: "${oldUser.lName}" → "${lName}"`);
        if (email && email !== oldUser.email) changes.push(`email: "${oldUser.email}" → "${email}"`);
        
        if (changes.length > 0) {
            const adminAction = `updated ${oldUser.fName} ${oldUser.lName}: ${changes.join(', ')}.`;
            await logAdminAction(req.user.id, adminAction);
        }

        res.json({
            message: 'User information updated successfully.',
            userId: parseInt(id),
            updated: {
                fName: fName || oldUser.fName,
                lName: lName || oldUser.lName,
                email: email || oldUser.email
            }
        });

    } catch (error) {
        console.error('Error updating user info:', error);
        res.status(500).json({ message: 'Server error while updating user information.' });
    }
});

module.exports = router; // Ensure this is at the end of the file