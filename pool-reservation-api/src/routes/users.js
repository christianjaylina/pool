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
        const sql = `
            SELECT 
                user_id,
                fName,
                lName,
                email,
                is_active,
                created_at
            FROM users
            WHERE role = 'renter'
            ORDER BY lName ASC;
        `;
        const [renters] = await db.query(sql);

        res.json(renters);
    } catch (error) {
        console.error('Error fetching all renters:', error);
        res.status(500).json({ message: 'Server error while fetching renter list.' });
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
        const [user] = await db.query('SELECT role FROM users WHERE user_id = ?', [id]);
        
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
        const adminAction = `${action} renter account ID ${id}.`;
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

module.exports = router; // Ensure this is at the end of the file