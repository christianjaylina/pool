// src/routes/notifications.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

/**
 * @route GET /api/notifications
 * @description Get notifications for the logged-in user with pagination
 * @access Private (User)
 */
router.get('/', auth, async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // Get total count for pagination
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
            [userId]
        );
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        const [notifications] = await db.query(
            `SELECT 
                notification_id as id,
                user_id,
                message,
                is_read as \`read\`,
                created_at
            FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        // Parse notifications to add type and title based on message content
        const parsedNotifications = notifications.map(n => {
            let type = 'info';
            let title = 'Notification';
            const message = n.message.toLowerCase();

            if (message.includes('approved')) {
                type = 'reservation_approved';
                title = 'Reservation Approved';
            } else if (message.includes('rejected') || message.includes('denied')) {
                type = 'reservation_rejected';
                title = 'Reservation Rejected';
            } else if (message.includes('reminder') || message.includes('upcoming')) {
                type = 'reminder';
                title = 'Reminder';
            } else if (message.includes('cancelled') || message.includes('canceled')) {
                type = 'reservation_cancelled';
                title = 'Reservation Cancelled';
            } else if (message.includes('pending') || message.includes('submitted')) {
                type = 'reservation_pending';
                title = 'Reservation Submitted';
            }

            return {
                ...n,
                type,
                title,
                read: Boolean(n.read)
            };
        });

        res.json({
            notifications: parsedNotifications,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore: page < totalPages
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Server error while fetching notifications.' });
    }
});

/**
 * @route GET /api/notifications/unread-count
 * @description Get count of unread notifications
 * @access Private (User)
 */
router.get('/unread-count', auth, async (req, res) => {
    const userId = req.user.id;

    try {
        const [result] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        res.json({ count: result[0].count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ message: 'Server error while fetching unread count.' });
    }
});

/**
 * @route PUT /api/notifications/read-all
 * @description Mark all notifications as read for the logged-in user
 * @access Private (User)
 */
router.put('/read-all', auth, async (req, res) => {
    const userId = req.user.id;

    try {
        const [result] = await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        res.json({ 
            message: 'All notifications marked as read.',
            count: result.affectedRows
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Server error while updating notifications.' });
    }
});

/**
 * @route PUT /api/notifications/:id/read
 * @description Mark a single notification as read
 * @access Private (User)
 */
router.put('/:id/read', auth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // Verify the notification belongs to the user
        const [notification] = await db.query(
            'SELECT notification_id FROM notifications WHERE notification_id = ? AND user_id = ?',
            [id, userId]
        );

        if (notification.length === 0) {
            return res.status(404).json({ message: 'Notification not found.' });
        }

        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE notification_id = ?',
            [id]
        );

        res.json({ message: 'Notification marked as read.', id: parseInt(id) });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Server error while updating notification.' });
    }
});

/**
 * Helper function to create a notification (for use by other routes)
 * @param {number} userId - The user ID to send notification to
 * @param {string} message - The notification message
 */
async function createNotification(userId, message) {
    try {
        await db.query(
            'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
            [userId, message]
        );
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

module.exports = router;
module.exports.createNotification = createNotification;
