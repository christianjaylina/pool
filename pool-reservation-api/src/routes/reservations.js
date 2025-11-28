// src/routes/reservations.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth'); // Basic user auth
const adminAuth = require('../middleware/adminAuth'); // Admin auth
const { sendEmailNotification } = require('../services/notificationService');
const { logAdminAction } = require('../services/logService');

// Pool operating hours for calculation (Adjust as needed)
const POOL_OPEN = '08:00:00';
const POOL_CLOSE = '20:00:00';
const SLOT_DURATION_MINUTES = 60; // Reservations are in 60-minute blocks

/**
 * @route GET /api/reservations/availability/:date
 * @description Gets all available time slots for a given date.
 * @access Private (Renter/User)
 */
router.get('/availability/:date', auth, async (req, res) => {
    // Input date format: YYYY-MM-DD
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    try {
        // 1. Get ALL booked (approved) slots for the day
        const [reservedSlots] = await db.query(
            `SELECT start_time, end_time FROM reservations 
             WHERE DATE(start_time) = ? AND status = 'approved'`,
            [date]
        );

        // 2. Get ALL admin-blocked slots for the day
        const [blockedSlots] = await db.query(
            `SELECT blocked_start_time AS start_time, blocked_end_time AS end_time 
             FROM blocked_dates 
             WHERE DATE(blocked_start_time) = ?`,
            [date]
        );
        
        // Combine and sort all unavailable time periods
        const unavailablePeriods = [...reservedSlots, ...blockedSlots]
            .map(slot => ({ 
                start: new Date(`${date} ${new Date(slot.start_time).toTimeString().substring(0, 8)}`),
                end: new Date(`${date} ${new Date(slot.end_time).toTimeString().substring(0, 8)}`) 
            }))
            .sort((a, b) => a.start - b.start);

        // 3. Logic to determine available slots (Simplified Time Calculation)
        let currentTime = new Date(`${date} ${POOL_OPEN}`);
        const poolCloseTime = new Date(`${date} ${POOL_CLOSE}`);
        const availableSlots = [];
        
        while (currentTime < poolCloseTime) {
            const slotStart = new Date(currentTime);
            // Calculate the end time of the potential slot
            const slotEnd = new Date(currentTime.getTime() + SLOT_DURATION_MINUTES * 60000); 

            // Check if the slot overlaps with any unavailable period
            let isAvailable = true;
            for (const period of unavailablePeriods) {
                // If potential slot starts before period ends AND potential slot ends after period starts, it overlaps.
                if (slotStart < period.end && slotEnd > period.start) {
                    isAvailable = false;
                    break; 
                }
            }

            if (isAvailable && slotEnd <= poolCloseTime) {
                availableSlots.push({
                    startTime: slotStart.toTimeString().substring(0, 5), // Format HH:MM
                    endTime: slotEnd.toTimeString().substring(0, 5)
                });
            }

            // Move to the next potential slot
            currentTime = slotEnd;
        }

        res.json({ date, availableSlots });

    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ message: 'Server error while checking availability.' });
    }
});

/**
 * @route POST /api/reservations/request
 * @description Renter requests a new pool reservation.
 * @access Private (Renter)
 */
router.post('/request', auth, async (req, res) => {
    // Only Renters can make a reservation request
    if (req.user.role !== 'renter') {
        return res.status(403).json({ message: 'Only renters can request reservations.' });
    }

    const { date, startTime, endTime } = req.body; // e.g., date: '2025-11-20', startTime: '09:00', endTime: '10:00'
    const userId = req.user.id;

    // We combine date and time strings to create DATETIME objects for database insertion
    const startDateTime = `${date} ${startTime}:00`;
    const endDateTime = `${date} ${endTime}:00`;

    // Basic input validation
    if (!date || !startTime || !endTime) {
        return res.status(400).json({ message: 'Missing required reservation fields (date, start time, end time).' });
    }
    
    // Check if reservation is for a future time
    if (new Date(startDateTime) < new Date()) {
         return res.status(400).json({ message: 'Cannot book a reservation in the past.' });
    }
    
    // Check if end time is after start time
    if (new Date(endDateTime) <= new Date(startDateTime)) {
         return res.status(400).json({ message: 'End time must be after start time.' });
    }

    try {
        // CRITICAL CHECK: Check for overlap with any existing APPROVED booking or ADMIN block
        const [conflict] = await db.query(
            `SELECT reservation_id FROM reservations 
             WHERE (status = 'approved') AND (
                (start_time < ? AND end_time > ?) OR
                (start_time < ? AND end_time > ?) OR
                (start_time = ?)
             )
             UNION
             SELECT blocked_id AS reservation_id FROM blocked_dates 
             WHERE (
                (blocked_start_time < ? AND blocked_end_time > ?) OR
                (blocked_start_time < ? AND blocked_end_time > ?) OR
                (blocked_start_time = ?)
             )`,
            [
                endDateTime, startDateTime, // Check 1: Existing slot fully contains new slot
                startDateTime, endDateTime, // Check 2: New slot fully contains existing slot
                startDateTime,              // Check 3: Start times are identical
                
                endDateTime, startDateTime, // Check against blocked dates
                startDateTime, endDateTime, 
                startDateTime
            ]
        );

        if (conflict.length > 0) {
            return res.status(409).json({ message: 'The requested time slot is already booked or blocked.' });
        }

        // 2. Insert the new reservation request (status is 'pending' by default)
        const sql = `
            INSERT INTO reservations (user_id, start_time, end_time)
            VALUES (?, ?, ?)
        `;
        const [result] = await db.query(sql, [userId, startDateTime, endDateTime]);

        // 3. FETCH RENTER NAME for the notification email (FIXED: Fetches fName/lName)
        const [renterData] = await db.query(
            'SELECT fName, lName FROM users WHERE user_id = ?', 
            [userId]
        );
        const renter = renterData[0];
        
        // Define the recipient using the new ADMIN_NOTIFICATION_EMAIL variable
        const adminRecipientEmail = process.env.ADMIN_NOTIFICATION_EMAIL; 
        
        // ** INTEGRATION POINT: Notify Admin of New Request **
        const adminEmailSubject = `[NEW REQUEST] Pool Booking from ${renter.fName} ${renter.lName}`; 
        const adminEmailContent = `
            <h1>New Reservation Request</h1>
            <p>A new reservation request has been submitted by ${renter.fName} ${renter.lName} (User ID: ${userId}).</p>
            <p><strong>Time:</strong> ${startDateTime} to ${endDateTime}</p>
            <p>Please log in to the Admin Dashboard to review and approve/reject this request.</p>
        `;
        
        // Send the email to the dedicated Admin notification address
        sendEmailNotification(adminRecipientEmail, adminEmailSubject, adminEmailContent);
        
        res.status(201).json({
            message: 'Reservation request submitted successfully. Awaiting Admin approval.',
            reservationId: result.insertId,
            status: 'pending'
        });

    } catch (error) {
        console.error('Reservation creation error:', error);
        res.status(500).json({ message: 'Server error during reservation request.' });
    }
});

/**
 * @route GET /api/reservations/admin/pending
 * @description Admin views all pending reservation requests, including renter details.
 * @access Private (Admin)
 */
router.get('/admin/pending', adminAuth, async (req, res) => {
    try {
        const sql = `
            SELECT 
                r.reservation_id,
                r.start_time,
                r.end_time,
                r.created_at AS requested_at,
                u.user_id,
                u.fName,
                u.lName,
                u.email
            FROM reservations r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.status = 'pending'
            ORDER BY r.created_at ASC;
        `;
        const [pendingRequests] = await db.query(sql);

        res.json(pendingRequests);
    } catch (error) {
        console.error('Error fetching pending reservations:', error);
        res.status(500).json({ message: 'Server error while fetching pending reservations.' });
    }
});

/**
 * @route PUT /api/reservations/admin/status/:id
 * @description Admin approves or rejects a reservation by ID.
 * @access Private (Admin)
 */
router.put('/admin/status/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { newStatus } = req.body; // Expected values: 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(newStatus)) {
        return res.status(400).json({ message: 'Invalid status provided.' });
    }

    try {
        // 1. Check if the reservation exists and is currently pending
        const [reservation] = await db.query(
            'SELECT user_id, start_time, end_time, status FROM reservations WHERE reservation_id = ?', 
            [id]
        );

        if (reservation.length === 0) {
            return res.status(404).json({ message: 'Reservation not found.' });
        }
        
        if (reservation[0].status !== 'pending') {
            return res.status(400).json({ message: `Reservation is already ${reservation[0].status}.` });
        }

        // 2. If approving, re-run the conflict check (just in case)
        if (newStatus === 'approved') {
            const startDateTime = reservation[0].start_time;
            const endDateTime = reservation[0].end_time;
            
            // Check for overlap with any existing APPROVED booking or ADMIN block (excluding the current one if it were already approved)
            const [conflict] = await db.query(
                `SELECT reservation_id FROM reservations 
                 WHERE status = 'approved' AND reservation_id != ? AND (
                    (start_time < ? AND end_time > ?) OR
                    (start_time < ? AND end_time > ?) OR
                    (start_time = ?)
                 )
                 UNION
                 SELECT blocked_id AS reservation_id FROM blocked_dates 
                 WHERE (
                    (blocked_start_time < ? AND blocked_end_time > ?) OR
                    (blocked_start_time < ? AND blocked_end_time > ?) OR
                    (blocked_start_time = ?)
                 )`,
                [
                    id, endDateTime, startDateTime, 
                    startDateTime, endDateTime, 
                    startDateTime,
                    
                    endDateTime, startDateTime, 
                    startDateTime, endDateTime, 
                    startDateTime
                ]
            );

            if (conflict.length > 0) {
                // Should be very rare, but essential for data integrity
                return res.status(409).json({ 
                    message: 'Conflict detected. This time slot is no longer available.',
                    conflictId: conflict[0].reservation_id
                });
            }
        }

        // 3. Update the status
        const [result] = await db.query(
            'UPDATE reservations SET status = ? WHERE reservation_id = ?',
            [newStatus, id]
        );

        // 4. Fetch Renter email and reservation details for notification
        const [renterData] = await db.query('SELECT email FROM users WHERE user_id = ?', [reservation[0].user_id]);
        const renterEmail = renterData[0].email;
        const statusMessage = newStatus === 'approved' ? 'approved' : 'rejected';
        const statusColor = newStatus === 'approved' ? 'green' : 'red';
        
        // ** INTEGRATION POINT: Notify Renter of Status Change **
        const renterSubject = `Your Pool Reservation Status Update - ${statusMessage.toUpperCase()}`;
        const renterContent = `
            <h1 style="color: ${statusColor};">Reservation ${statusMessage.toUpperCase()}</h1>
            <p>Your pool reservation for the time slot <strong>${reservation[0].start_time} to ${reservation[0].end_time}</strong> has been ${statusMessage} by the resort administration.</p>
            ${newStatus === 'approved' 
                ? '<p>Thank you for booking! We look forward to seeing you.</p>' 
                : '<p>Your booking could not be approved due to high demand or an internal block. Please check availability for an alternative time slot on your Renter Dashboard.</p>'
            }
        `;
        sendEmailNotification(renterEmail, renterSubject, renterContent);
        
        // 5. Log the Admin action
        const adminAction = `${newStatus} reservation ${id} for user ${reservation[0].user_id}.`;
        await logAdminAction(req.user.id, adminAction);
        
        res.json({ 
            message: `Reservation ${id} successfully ${newStatus}.`,
            reservationId: id,
            newStatus: newStatus
        });

    } catch (error) {
        console.error('Error updating reservation status:', error);
        res.status(500).json({ message: 'Server error while updating reservation status.' });
    }
});

/**
 * @route POST /api/reservations/admin/block
 * @description Admin blocks a specific date/time range.
 * @access Private (Admin)
 */
router.post('/admin/block', adminAuth, async (req, res) => {
    const { date, startTime, endTime, reason } = req.body;
    const adminUserId = req.user.id; // From the JWT payload

    // Combine date and time to DATETIME objects
    const blockedStart = `${date} ${startTime}:00`;
    const blockedEnd = `${date} ${endTime}:00`;

    if (!date || !startTime || !endTime || !reason) {
        return res.status(400).json({ message: 'Missing required fields for blocking.' });
    }

    try {
        // 1. Check for conflicts with existing APPROVED reservations
        const [conflict] = await db.query(
            `SELECT reservation_id FROM reservations 
             WHERE status = 'approved' AND (
                (start_time < ? AND end_time > ?) OR
                (start_time < ? AND end_time > ?) OR
                (start_time = ?)
             )`,
            [blockedEnd, blockedStart, blockedStart, blockedEnd, blockedStart]
        );

        if (conflict.length > 0) {
            return res.status(409).json({ 
                message: 'Cannot block this time. It overlaps with an existing approved reservation.',
                conflictingReservationId: conflict[0].reservation_id
            });
        }
        
        // 2. Insert the block into the blocked_dates table
        const sql = `
            INSERT INTO blocked_dates (blocked_start_time, blocked_end_time, reason, admin_user_id)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await db.query(sql, [blockedStart, blockedEnd, reason, adminUserId]);

        // TO DO: Send automated notification to renters who may have been impacted
        
        // ** INTEGRATION POINT: Log the Admin Action **
        const blockAction = `Blocked time from ${blockedStart} to ${blockedEnd}. Reason: ${reason}`;
        await logAdminAction(adminUserId, blockAction);

        res.status(201).json({
            message: 'Time slot successfully blocked.',
            blockedId: result.insertId,
            reason
        });

    } catch (error) {
        console.error('Error creating block:', error);
        res.status(500).json({ message: 'Server error while creating block.' });
    }
});

/**
 * @route GET /api/reservations/history
 * @description Renter views all of their past and upcoming reservations.
 * @access Private (Renter/User)
 */
router.get('/history', auth, async (req, res) => {
    const userId = req.user.id;

    try {
        const sql = `
            SELECT 
                reservation_id,
                start_time,
                end_time,
                status,
                created_at
            FROM reservations
            WHERE user_id = ?
            ORDER BY start_time DESC;
        `;
        const [history] = await db.query(sql, [userId]);

        res.json(history);
    } catch (error) {
        console.error('Error fetching renter history:', error);
        res.status(500).json({ message: 'Server error while fetching reservation history.' });
    }
});

/**
 * @route GET /api/reservations/admin/all
 * @description Admin views all reservations (pending, approved, rejected, cancelled).
 * @access Private (Admin)
 */
router.get('/admin/all', adminAuth, async (req, res) => {
    try {
        const sql = `
            SELECT 
                r.reservation_id,
                r.start_time,
                r.end_time,
                r.status,
                r.created_at,
                u.user_id AS renter_id,
                u.fName,
                u.lName,
                u.email
            FROM reservations r
            JOIN users u ON r.user_id = u.user_id
            ORDER BY r.start_time DESC;
        `;
        const [allReservations] = await db.query(sql);

        res.json(allReservations);
    } catch (error) {
        console.error('Error fetching all reservations for admin:', error);
        res.status(500).json({ message: 'Server error while fetching all reservations.' });
    }
});

/**
 * @route GET /api/reservations/admin/logs
 * @description Admin views all historical audit logs.
 * @access Private (Admin)
 */
router.get('/admin/logs', adminAuth, async (req, res) => {
    try {
        const sql = `
            SELECT 
                al.log_id,
                al.action,
                al.created_at,
                u.fName,
                u.lName
            FROM admin_logs al
            JOIN users u ON al.admin_user_id = u.user_id
            ORDER BY al.created_at DESC;
        `;
        const [logs] = await db.query(sql);

        res.json(logs);
    } catch (error) {
        console.error('Error fetching admin logs:', error);
        res.status(500).json({ message: 'Server error while fetching admin logs.' });
    }
});

/**
 * @route GET /api/reservations/admin/settings
 * @description Admin retrieves the current pool configuration settings.
 * @access Private (Admin)
 */
router.get('/admin/settings', adminAuth, async (req, res) => {
    try {
        // Fetch the single row from the pool_settings table
        const [settings] = await db.query('SELECT * FROM pool_settings LIMIT 1');
        
        if (settings.length === 0) {
            // Handle case where settings row hasn't been initialized
            return res.status(404).json({ message: 'Pool settings not initialized.' });
        }

        res.json(settings[0]);
    } catch (error) {
        console.error('Error fetching pool settings:', error);
        res.status(500).json({ message: 'Server error while fetching pool settings.' });
    }
});

/**
 * @route PUT /api/reservations/admin/settings
 * @description Admin updates the pool configuration settings.
 * @access Private (Admin)
 */
router.put('/admin/settings', adminAuth, async (req, res) => {
    // Destructure the capacity variables from the request body
    const { max_people_slot_1, max_people_slot_2, max_people_slot_3, max_people_slot_4 } = req.body;
    const adminUserId = req.user.id;
    
    // Basic validation to ensure all required fields are present and are numbers
    if (
        !Number.isInteger(max_people_slot_1) || max_people_slot_1 < 1 ||
        !Number.isInteger(max_people_slot_2) || max_people_slot_2 < 1 ||
        !Number.isInteger(max_people_slot_3) || max_people_slot_3 < 1 ||
        !Number.isInteger(max_people_slot_4) || max_people_slot_4 < 1
    ) {
        return res.status(400).json({ message: 'All capacity slots must be positive integers.' });
    }

    try {
        // Since there should only be one row in pool_settings, we use UPDATE
        const sql = `
            UPDATE pool_settings SET
                max_people_slot_1 = ?,
                max_people_slot_2 = ?,
                max_people_slot_3 = ?,
                max_people_slot_4 = ?
            WHERE setting_id = 1; -- Assuming the settings row has an ID of 1
        `;
        
        await db.query(sql, [
            max_people_slot_1, 
            max_people_slot_2, 
            max_people_slot_3, 
            max_people_slot_4
        ]);
        
        // Log the Admin action
        const action = `Updated pool capacity settings to: S1=${max_people_slot_1}, S2=${max_people_slot_2}, S3=${max_people_slot_3}, S4=${max_people_slot_4}.`;
        await logAdminAction(adminUserId, action);

        res.json({
            message: 'Pool capacity settings updated successfully.',
            newSettings: req.body
        });

    } catch (error) {
        console.error('Error updating pool settings:', error);
        res.status(500).json({ message: 'Server error while updating pool settings.' });
    }
});

module.exports = router;