// src/routes/feedback.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

/**
 * @route POST /api/feedback
 * @description User submits feedback
 * @access Private (Renter)
 */
router.post('/', auth, async (req, res) => {
    const { subject, message, rating } = req.body;
    const userId = req.user.id;

    // Validation
    if (!subject || !message || !rating) {
        return res.status(400).json({ message: 'Subject, message, and rating are required.' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    try {
        const sql = `
            INSERT INTO feedback (user_id, subject, message, rating, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `;
        const [result] = await db.query(sql, [userId, subject, message, rating]);

        res.status(201).json({
            message: 'Feedback submitted successfully.',
            feedbackId: result.insertId
        });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ message: 'Server error while submitting feedback.' });
    }
});

/**
 * @route GET /api/feedback/admin/all
 * @description Admin views all feedback with user details
 * @access Private (Admin)
 */
router.get('/admin/all', adminAuth, async (req, res) => {
    try {
        const sql = `
            SELECT 
                f.feedback_id,
                f.subject,
                f.message,
                f.rating,
                f.created_at,
                u.user_id,
                u.fName,
                u.lName,
                u.email
            FROM feedback f
            JOIN users u ON f.user_id = u.user_id
            ORDER BY f.created_at DESC
        `;
        const [feedbackList] = await db.query(sql);

        res.json(feedbackList);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ message: 'Server error while fetching feedback.' });
    }
});

/**
 * @route GET /api/feedback/my
 * @description User views their own feedback history
 * @access Private (Renter)
 */
router.get('/my', auth, async (req, res) => {
    const userId = req.user.id;

    try {
        const sql = `
            SELECT 
                feedback_id,
                subject,
                message,
                rating,
                created_at
            FROM feedback
            WHERE user_id = ?
            ORDER BY created_at DESC
        `;
        const [feedbackList] = await db.query(sql, [userId]);

        res.json(feedbackList);
    } catch (error) {
        console.error('Error fetching user feedback:', error);
        res.status(500).json({ message: 'Server error while fetching feedback.' });
    }
});

module.exports = router;
