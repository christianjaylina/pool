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
 * @route GET /api/reservations/slot-status/:date
 * @description Gets the booking status and capacity for all time slots on a given date.
 * @access Private (Renter/User)
 */
router.get('/slot-status/:date', auth, async (req, res) => {
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    try {
        // 1. Get pool settings for max capacity
        const [settings] = await db.query('SELECT * FROM pool_settings LIMIT 1');
        const maxCapacity = settings.length > 0 
            ? Math.max(
                settings[0].max_people_slot_1 || 10,
                settings[0].max_people_slot_2 || 10,
                settings[0].max_people_slot_3 || 10,
                settings[0].max_people_slot_4 || 10
            )
            : 10;

        // 2. Get all approved reservations for this date with guest counts
        let reservations;
        try {
            [reservations] = await db.query(
                `SELECT start_time, end_time, guests FROM reservations 
                 WHERE DATE(start_time) = ? AND status = 'approved'`,
                [date]
            );
        } catch (queryError) {
            // If guests column doesn't exist, query without it
            if (queryError.code === 'ER_BAD_FIELD_ERROR') {
                [reservations] = await db.query(
                    `SELECT start_time, end_time, 1 as guests FROM reservations 
                     WHERE DATE(start_time) = ? AND status = 'approved'`,
                    [date]
                );
            } else {
                throw queryError;
            }
        }

        // 3. Get all admin-blocked slots for this date
        const [blockedSlots] = await db.query(
            `SELECT blocked_start_time AS start_time, blocked_end_time AS end_time 
             FROM blocked_dates 
             WHERE DATE(blocked_start_time) = ?`,
            [date]
        );

        // 3.5. Get all swimming lessons for this date
        let swimmingLessons = [];
        try {
            [swimmingLessons] = await db.query(
                `SELECT start_time, end_time, participants FROM swimming_lessons 
                 WHERE lesson_date = ?`,
                [date]
            );
        } catch (lessonError) {
            // Table might not exist yet, that's OK
            if (lessonError.code !== 'ER_NO_SUCH_TABLE') {
                console.log('Note: Swimming lessons table not found');
            }
        }

        // 4. Generate all time slots from 6 AM to 10 PM
        const timeSlots = [];
        for (let hour = 6; hour <= 22; hour++) {
            const slotTime = `${hour.toString().padStart(2, '0')}:00`;
            const slotStart = new Date(`${date} ${slotTime}:00`);
            const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // 1 hour slot

            // Check if this slot is blocked
            let isBlocked = false;
            for (const block of blockedSlots) {
                const blockStart = new Date(block.start_time);
                const blockEnd = new Date(block.end_time);
                if (slotStart < blockEnd && slotEnd > blockStart) {
                    isBlocked = true;
                    break;
                }
            }

            // Calculate current guest count for this time slot
            let currentGuests = 0;
            for (const res of reservations) {
                const resStart = new Date(res.start_time);
                const resEnd = new Date(res.end_time);
                // Check if this reservation overlaps with the slot
                if (slotStart < resEnd && slotEnd > resStart) {
                    currentGuests += res.guests || 1;
                }
            }

            // Add swimming lesson participants (they take priority over regular guests)
            let lessonParticipants = 0;
            for (const lesson of swimmingLessons) {
                const lessonStart = new Date(`${date} ${lesson.start_time}`);
                const lessonEnd = new Date(`${date} ${lesson.end_time}`);
                // Check if this lesson overlaps with the slot
                if (slotStart < lessonEnd && slotEnd > lessonStart) {
                    lessonParticipants += lesson.participants || 0;
                }
            }

            const totalOccupancy = currentGuests + lessonParticipants;

            timeSlots.push({
                time: slotTime,
                currentGuests,
                lessonParticipants,
                totalOccupancy,
                maxCapacity,
                isFull: totalOccupancy >= maxCapacity,
                isBlocked,
                availableSpots: Math.max(0, maxCapacity - totalOccupancy)
            });
        }

        res.json({ 
            date, 
            maxCapacity,
            slots: timeSlots 
        });

    } catch (error) {
        console.error('Error fetching slot status:', error);
        res.status(500).json({ message: 'Server error while fetching slot status.' });
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

    const { date, startTime, endTime, guests = 1 } = req.body; // e.g., date: '2025-11-20', startTime: '09:00', endTime: '10:00', guests: 5
    const userId = req.user.id;
    const guestCount = parseInt(guests) || 1;

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
        // 0. Check user's max_guests limit
        try {
            const [userLimit] = await db.query('SELECT max_guests FROM users WHERE user_id = ?', [userId]);
            if (userLimit.length > 0 && userLimit[0].max_guests !== null) {
                if (guestCount > userLimit[0].max_guests) {
                    return res.status(400).json({ 
                        message: `You are limited to a maximum of ${userLimit[0].max_guests} guest(s) per reservation.`,
                        maxGuests: userLimit[0].max_guests
                    });
                }
            }
        } catch (limitError) {
            // If max_guests column doesn't exist, skip the check
            if (limitError.code !== 'ER_BAD_FIELD_ERROR') {
                throw limitError;
            }
        }

        // 0.5. Check if user already has a pending reservation for this time slot
        const [existingPending] = await db.query(
            `SELECT reservation_id, start_time, end_time FROM reservations 
             WHERE user_id = ? AND status = 'pending' AND (
                (start_time < ? AND end_time > ?) OR
                (start_time < ? AND end_time > ?) OR
                (start_time = ? AND end_time = ?)
             )`,
            [userId, endDateTime, startDateTime, startDateTime, endDateTime, startDateTime, endDateTime]
        );

        if (existingPending.length > 0) {
            return res.status(409).json({ 
                message: 'You already have a pending reservation request for this time slot. Please wait for admin approval.',
                existingReservationId: existingPending[0].reservation_id,
                isPendingConflict: true
            });
        }

        // 1. Get pool settings for max capacity
        const [settings] = await db.query('SELECT * FROM pool_settings LIMIT 1');
        const maxCapacity = settings.length > 0 
            ? Math.max(
                settings[0].max_people_slot_1 || 10,
                settings[0].max_people_slot_2 || 10,
                settings[0].max_people_slot_3 || 10,
                settings[0].max_people_slot_4 || 10
            )
            : 10;

        // 2. Check if time slot is blocked by admin
        const [blockedSlots] = await db.query(
            `SELECT blocked_id FROM blocked_dates 
             WHERE (
                (blocked_start_time < ? AND blocked_end_time > ?) OR
                (blocked_start_time < ? AND blocked_end_time > ?) OR
                (blocked_start_time = ?)
             )`,
            [endDateTime, startDateTime, startDateTime, endDateTime, startDateTime]
        );

        if (blockedSlots.length > 0) {
            return res.status(409).json({ message: 'This time slot is blocked by the administrator.' });
        }

        // 3. Check current capacity for the requested time slot
        let existingReservations;
        try {
            [existingReservations] = await db.query(
                `SELECT COALESCE(SUM(guests), 0) as totalGuests FROM reservations 
                 WHERE status = 'approved' AND (
                    (start_time < ? AND end_time > ?) OR
                    (start_time < ? AND end_time > ?) OR
                    (start_time = ?)
                 )`,
                [endDateTime, startDateTime, startDateTime, endDateTime, startDateTime]
            );
        } catch (queryError) {
            // If guests column doesn't exist, count reservations instead
            if (queryError.code === 'ER_BAD_FIELD_ERROR') {
                [existingReservations] = await db.query(
                    `SELECT COUNT(*) as totalGuests FROM reservations 
                     WHERE status = 'approved' AND (
                        (start_time < ? AND end_time > ?) OR
                        (start_time < ? AND end_time > ?) OR
                        (start_time = ?)
                     )`,
                    [endDateTime, startDateTime, startDateTime, endDateTime, startDateTime]
                );
            } else {
                throw queryError;
            }
        }

        const currentGuests = parseInt(existingReservations[0]?.totalGuests) || 0;

        // 3.5. Check swimming lesson participants for the time slot
        let lessonParticipants = 0;
        try {
            const [lessons] = await db.query(
                `SELECT COALESCE(SUM(participants), 0) as totalParticipants FROM swimming_lessons 
                 WHERE lesson_date = ? AND (
                    (start_time < ? AND end_time > ?) OR
                    (start_time < ? AND end_time > ?) OR
                    (start_time = ?)
                 )`,
                [date, endTime, startTime, startTime, endTime, startTime]
            );
            lessonParticipants = parseInt(lessons[0]?.totalParticipants) || 0;
        } catch (lessonError) {
            // Table might not exist yet, that's OK
            if (lessonError.code !== 'ER_NO_SUCH_TABLE') {
                console.log('Note: Could not check swimming lessons');
            }
        }

        const totalOccupancy = currentGuests + lessonParticipants;
        const remainingCapacity = maxCapacity - totalOccupancy;

        if (guestCount > remainingCapacity) {
            if (remainingCapacity <= 0) {
                return res.status(409).json({ 
                    message: lessonParticipants > 0 
                        ? 'This time slot is fully booked due to swimming lessons.'
                        : 'This time slot is fully booked.',
                    currentCapacity: totalOccupancy,
                    maxCapacity: maxCapacity,
                    lessonParticipants
                });
            } else {
                return res.status(409).json({ 
                    message: `Only ${remainingCapacity} spot(s) available for this time slot. You requested ${guestCount} guest(s).`,
                    availableSpots: remainingCapacity,
                    maxCapacity: maxCapacity
                });
            }
        }

        // 4. Insert the new reservation request (status is 'pending' by default)
        // Check if guests column exists, otherwise use fallback
        let result;
        try {
            const sql = `
                INSERT INTO reservations (user_id, start_time, end_time, guests)
                VALUES (?, ?, ?, ?)
            `;
            [result] = await db.query(sql, [userId, startDateTime, endDateTime, guestCount]);
        } catch (insertError) {
            // If guests column doesn't exist, insert without it
            if (insertError.code === 'ER_BAD_FIELD_ERROR') {
                console.log('Note: guests column not found, inserting without it');
                const sql = `
                    INSERT INTO reservations (user_id, start_time, end_time)
                    VALUES (?, ?, ?)
                `;
                [result] = await db.query(sql, [userId, startDateTime, endDateTime]);
            } else {
                throw insertError;
            }
        }

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
        
        // ** Save notification to database for the user **
        const formattedTime = new Date(startDateTime).toLocaleString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
        const notificationMessage = `Your reservation request for ${formattedTime} has been submitted and is pending admin approval.`;
        
        await db.query(
            'INSERT INTO notifications (user_id, message, is_read, created_at) VALUES (?, ?, 0, NOW())',
            [userId, notificationMessage]
        );
        
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

        // 4. Fetch Renter email and name for notification
        const [renterData] = await db.query('SELECT email, fName, lName FROM users WHERE user_id = ?', [reservation[0].user_id]);
        const renter = renterData[0];
        
        // Format the reservation time nicely
        const formattedStartTime = new Date(reservation[0].start_time).toLocaleString('en-US', { 
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
        const formattedEndTime = new Date(reservation[0].end_time).toLocaleTimeString('en-US', { 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
        
        // ** Send email notification to user **
        if (newStatus === 'approved') {
            const approvedSubject = `✅ Your Pool Reservation Has Been Approved - Luxuria Bacaca Resort`;
            const approvedContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 10px;">Reservation Approved!</h1>
                    <p>Dear ${renter.fName},</p>
                    <p>Great news! Your pool reservation has been <strong style="color: #28a745;">approved</strong>.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Reservation Details:</h3>
                        <p><strong>📅 Date & Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
                    </div>
                    <p>We look forward to seeing you at Luxuria Bacaca Resort!</p>
                    <p style="color: #666; font-size: 14px;">If you need to cancel your reservation, please do so through your dashboard.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #888; font-size: 12px;">Luxuria Bacaca Resort - Pool Reservation System</p>
                </div>
            `;
            sendEmailNotification(renter.email, approvedSubject, approvedContent);
        } else {
            const rejectedSubject = `❌ Your Pool Reservation Has Been Declined - Luxuria Bacaca Resort`;
            const rejectedContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">Reservation Declined</h1>
                    <p>Dear ${renter.fName},</p>
                    <p>We regret to inform you that your pool reservation has been <strong style="color: #dc3545;">declined</strong>.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Requested Reservation:</h3>
                        <p><strong>📅 Date & Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
                    </div>
                    <p>This may be due to high demand, maintenance scheduling, or other operational reasons.</p>
                    <p><strong>What to do next:</strong> Please check the availability calendar and try booking a different time slot.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #888; font-size: 12px;">Luxuria Bacaca Resort - Pool Reservation System</p>
                </div>
            `;
            sendEmailNotification(renter.email, rejectedSubject, rejectedContent);
        }
        
        // ** Save notification to database **
        const startTime = new Date(reservation[0].start_time).toLocaleString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
        const notificationMessage = newStatus === 'approved'
            ? `Your reservation for ${startTime} has been approved. We look forward to seeing you!`
            : `Your reservation for ${startTime} has been rejected. Please try booking a different time slot.`;
        
        await db.query(
            'INSERT INTO notifications (user_id, message, is_read, created_at) VALUES (?, ?, 0, NOW())',
            [reservation[0].user_id, notificationMessage]
        );
        
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
 * @route GET /api/reservations/admin/blocked
 * @description Admin views all blocked time slots.
 * @access Private (Admin)
 */
router.get('/admin/blocked', adminAuth, async (req, res) => {
    try {
        const sql = `
            SELECT 
                blocked_id,
                blocked_start_time,
                blocked_end_time,
                reason,
                admin_user_id,
                created_at
            FROM blocked_dates
            ORDER BY blocked_start_time DESC
        `;
        const [blockedSlots] = await db.query(sql);

        res.json(blockedSlots);
    } catch (error) {
        console.error('Error fetching blocked slots:', error);
        res.status(500).json({ message: 'Server error while fetching blocked slots.' });
    }
});

/**
 * @route DELETE /api/reservations/admin/blocked/:id
 * @description Admin removes a blocked time slot.
 * @access Private (Admin)
 */
router.delete('/admin/blocked/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const adminUserId = req.user.id;

    try {
        // Check if the block exists
        const [existing] = await db.query(
            'SELECT blocked_id, blocked_start_time, blocked_end_time FROM blocked_dates WHERE blocked_id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Blocked slot not found.' });
        }

        // Delete the block
        await db.query('DELETE FROM blocked_dates WHERE blocked_id = ?', [id]);

        // Log the action
        const block = existing[0];
        const unblockAction = `Removed block from ${block.blocked_start_time} to ${block.blocked_end_time}.`;
        await logAdminAction(adminUserId, unblockAction);

        res.json({ message: 'Blocked slot removed successfully.' });
    } catch (error) {
        console.error('Error removing blocked slot:', error);
        res.status(500).json({ message: 'Server error while removing blocked slot.' });
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
 * @route PUT /api/reservations/admin/cancel/:id
 * @description Admin cancels an approved reservation with a reason.
 * @access Private (Admin)
 * NOTE: This route MUST come before /:id/cancel to avoid Express matching 'admin' as an :id
 */
router.put('/admin/cancel/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUserId = req.user.id;

    if (!reason || reason.trim() === '') {
        return res.status(400).json({ message: 'Cancellation reason is required.' });
    }

    try {
        // 1. Check if the reservation exists and is currently approved
        const [reservation] = await db.query(
            'SELECT user_id, start_time, end_time, status FROM reservations WHERE reservation_id = ?', 
            [id]
        );

        if (reservation.length === 0) {
            return res.status(404).json({ message: 'Reservation not found.' });
        }
        
        if (reservation[0].status !== 'approved') {
            return res.status(400).json({ message: `Only approved reservations can be cancelled. This reservation is ${reservation[0].status}.` });
        }

        // 2. Update the status to cancelled
        await db.query(
            'UPDATE reservations SET status = ? WHERE reservation_id = ?',
            ['cancelled', id]
        );

        // 3. Fetch Renter details for notification
        const [renterData] = await db.query('SELECT email, fName, lName FROM users WHERE user_id = ?', [reservation[0].user_id]);
        const renter = renterData[0];
        
        // Format the reservation time nicely
        const formattedStartTime = new Date(reservation[0].start_time).toLocaleString('en-US', { 
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
        const formattedEndTime = new Date(reservation[0].end_time).toLocaleTimeString('en-US', { 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
        
        // 4. Send email notification to the renter
        const renterSubject = `⚠️ Your Pool Reservation Has Been Cancelled - Luxuria Bacaca Resort`;
        const renterContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">Reservation Cancelled</h1>
                <p>Dear ${renter.fName},</p>
                <p>We regret to inform you that your pool reservation has been <strong style="color: #dc3545;">cancelled</strong> by the resort administration.</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Cancelled Reservation:</h3>
                    <p><strong>📅 Date & Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
                </div>
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #856404;">Reason for Cancellation:</h3>
                    <p style="margin-bottom: 0;">${reason}</p>
                </div>
                <p>We sincerely apologize for any inconvenience this may cause. Please feel free to make a new reservation for a different time slot through your dashboard.</p>
                <p>Thank you for your understanding.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px;">Luxuria Bacaca Resort - Pool Reservation System</p>
            </div>
        `;
        sendEmailNotification(renter.email, renterSubject, renterContent);
        
        // 5. Save notification to database for the user
        const formattedTime = new Date(reservation[0].start_time).toLocaleString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
        const notificationMessage = `Your reservation for ${formattedTime} has been cancelled by the administrator. Reason: ${reason}`;
        
        await db.query(
            'INSERT INTO notifications (user_id, message, is_read, created_at) VALUES (?, ?, 0, NOW())',
            [reservation[0].user_id, notificationMessage]
        );
        
        // 6. Log the Admin action
        const adminAction = `Cancelled approved reservation ${id} for user ${renter.fName} ${renter.lName}. Reason: ${reason}`;
        await logAdminAction(adminUserId, adminAction);
        
        res.json({ 
            message: `Reservation ${id} has been cancelled successfully.`,
            reservationId: id,
            reason: reason
        });

    } catch (error) {
        console.error('Error cancelling reservation:', error);
        res.status(500).json({ message: 'Server error while cancelling reservation.' });
    }
});

/**
 * @route PUT /api/reservations/:id/cancel
 * @description User cancels their own reservation.
 * @access Private (Renter/User)
 */
router.put('/:id/cancel', auth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // 1. Check if the reservation exists and belongs to the user
        const [reservation] = await db.query(
            'SELECT reservation_id, user_id, status FROM reservations WHERE reservation_id = ?', 
            [id]
        );

        if (reservation.length === 0) {
            return res.status(404).json({ message: 'Reservation not found.' });
        }

        // 2. Verify the reservation belongs to the requesting user
        if (reservation[0].user_id !== userId) {
            return res.status(403).json({ message: 'You can only cancel your own reservations.' });
        }

        // 3. Check if the reservation can be cancelled (only pending or approved)
        if (!['pending', 'approved'].includes(reservation[0].status)) {
            return res.status(400).json({ message: `Cannot cancel a reservation that is already ${reservation[0].status}.` });
        }

        // 4. Update the status to cancelled
        await db.query(
            'UPDATE reservations SET status = ? WHERE reservation_id = ?',
            ['cancelled', id]
        );

        // ** Save notification to database **
        const [reservationDetails] = await db.query(
            'SELECT start_time FROM reservations WHERE reservation_id = ?',
            [id]
        );
        const formattedTime = new Date(reservationDetails[0].start_time).toLocaleString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
        const notificationMessage = `Your reservation for ${formattedTime} has been cancelled.`;
        
        await db.query(
            'INSERT INTO notifications (user_id, message, is_read, created_at) VALUES (?, ?, 0, NOW())',
            [userId, notificationMessage]
        );

        res.json({ 
            message: 'Reservation cancelled successfully.',
            reservationId: id
        });

    } catch (error) {
        console.error('Error cancelling reservation:', error);
        res.status(500).json({ message: 'Server error while cancelling reservation.' });
    }
});

/**
 * @route POST /api/reservations/admin/create
 * @description Admin creates a reservation on behalf of a user (auto-approved).
 * @access Private (Admin)
 */
router.post('/admin/create', adminAuth, async (req, res) => {
    const { userId, date, startTime, endTime, guests = 1 } = req.body;
    const adminId = req.user.id;
    const guestCount = parseInt(guests) || 1;

    // Combine date and time strings to create DATETIME objects
    const startDateTime = `${date} ${startTime}:00`;
    const endDateTime = `${date} ${endTime}:00`;

    // Basic input validation
    if (!userId || !date || !startTime || !endTime) {
        return res.status(400).json({ message: 'Missing required fields (userId, date, startTime, endTime).' });
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
        // 1. Verify the user exists and is a renter
        const [userCheck] = await db.query('SELECT user_id, fName, lName, email, role FROM users WHERE user_id = ?', [userId]);
        if (userCheck.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const targetUser = userCheck[0];
        if (targetUser.role !== 'renter') {
            return res.status(400).json({ message: 'Can only create reservations for renter accounts.' });
        }

        // 2. Get pool settings for max capacity
        const [settings] = await db.query('SELECT * FROM pool_settings LIMIT 1');
        const maxCapacity = settings.length > 0 
            ? Math.max(
                settings[0].max_people_slot_1 || 10,
                settings[0].max_people_slot_2 || 10,
                settings[0].max_people_slot_3 || 10,
                settings[0].max_people_slot_4 || 10
            )
            : 10;

        // 3. Check if time slot is blocked by admin
        const [blockedSlots] = await db.query(
            `SELECT blocked_id FROM blocked_dates 
             WHERE (
                (blocked_start_time < ? AND blocked_end_time > ?) OR
                (blocked_start_time < ? AND blocked_end_time > ?) OR
                (blocked_start_time = ?)
             )`,
            [endDateTime, startDateTime, startDateTime, endDateTime, startDateTime]
        );

        if (blockedSlots.length > 0) {
            return res.status(409).json({ message: 'This time slot is blocked.' });
        }

        // 4. Check current capacity for the requested time slot
        let existingReservations;
        try {
            [existingReservations] = await db.query(
                `SELECT COALESCE(SUM(guests), 0) as totalGuests FROM reservations 
                 WHERE status = 'approved' AND (
                    (start_time < ? AND end_time > ?) OR
                    (start_time < ? AND end_time > ?) OR
                    (start_time = ?)
                 )`,
                [endDateTime, startDateTime, startDateTime, endDateTime, startDateTime]
            );
        } catch (queryError) {
            if (queryError.code === 'ER_BAD_FIELD_ERROR') {
                [existingReservations] = await db.query(
                    `SELECT COUNT(*) as totalGuests FROM reservations 
                     WHERE status = 'approved' AND (
                        (start_time < ? AND end_time > ?) OR
                        (start_time < ? AND end_time > ?) OR
                        (start_time = ?)
                     )`,
                    [endDateTime, startDateTime, startDateTime, endDateTime, startDateTime]
                );
            } else {
                throw queryError;
            }
        }

        const currentGuests = parseInt(existingReservations[0]?.totalGuests) || 0;

        // 4.5. Check swimming lesson participants for the time slot
        let lessonParticipants = 0;
        try {
            const [lessons] = await db.query(
                `SELECT COALESCE(SUM(participants), 0) as totalParticipants FROM swimming_lessons 
                 WHERE lesson_date = ? AND (
                    (start_time < ? AND end_time > ?) OR
                    (start_time < ? AND end_time > ?) OR
                    (start_time = ?)
                 )`,
                [date, endTime, startTime, startTime, endTime, startTime]
            );
            lessonParticipants = parseInt(lessons[0]?.totalParticipants) || 0;
        } catch (lessonError) {
            if (lessonError.code !== 'ER_NO_SUCH_TABLE') {
                console.log('Note: Could not check swimming lessons');
            }
        }

        const totalOccupancy = currentGuests + lessonParticipants;
        const remainingCapacity = maxCapacity - totalOccupancy;

        if (guestCount > remainingCapacity) {
            if (remainingCapacity <= 0) {
                return res.status(409).json({ 
                    message: lessonParticipants > 0 
                        ? 'This time slot is fully booked due to swimming lessons.'
                        : 'This time slot is fully booked.',
                    currentCapacity: totalOccupancy,
                    maxCapacity: maxCapacity
                });
            } else {
                return res.status(409).json({ 
                    message: `Only ${remainingCapacity} spot(s) available. You requested ${guestCount} guest(s).`,
                    availableSpots: remainingCapacity,
                    maxCapacity: maxCapacity
                });
            }
        }

        // 5. Insert the reservation with 'approved' status (admin-created reservations are auto-approved)
        let result;
        try {
            const sql = `
                INSERT INTO reservations (user_id, start_time, end_time, guests, status)
                VALUES (?, ?, ?, ?, 'approved')
            `;
            [result] = await db.query(sql, [userId, startDateTime, endDateTime, guestCount]);
        } catch (insertError) {
            if (insertError.code === 'ER_BAD_FIELD_ERROR') {
                const sql = `
                    INSERT INTO reservations (user_id, start_time, end_time, status)
                    VALUES (?, ?, ?, 'approved')
                `;
                [result] = await db.query(sql, [userId, startDateTime, endDateTime]);
            } else {
                throw insertError;
            }
        }

        // 6. Log the admin action
        const adminAction = `created reservation (ID: ${result.insertId}) on behalf of user ${targetUser.fName} ${targetUser.lName} (ID: ${userId}) for ${startDateTime} to ${endDateTime}`;
        await logAdminAction(adminId, adminAction);

        // 7. Send notification email to the user
        const emailSubject = `[CONFIRMED] Pool Reservation at Luxuria Bacaca Resort`;
        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">Reservation Confirmed</h1>
                </div>
                <div style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 10px 10px;">
                    <p>Dear ${targetUser.fName},</p>
                    <p>A pool reservation has been created for you by our admin team.</p>
                    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px;">
                        <p style="margin: 0; color: #065f46;"><strong>Reservation ID:</strong> ${result.insertId}</p>
                        <p style="margin: 5px 0 0 0; color: #065f46;"><strong>Date & Time:</strong> ${startDateTime} - ${endDateTime.split(' ')[1]}</p>
                        <p style="margin: 5px 0 0 0; color: #065f46;"><strong>Guests:</strong> ${guestCount}</p>
                    </div>
                    <p>Your reservation is already confirmed and ready. Please arrive on time!</p>
                    <p>Best regards,<br/>Luxuria Bacaca Resort Team</p>
                </div>
            </div>
        `;
        sendEmailNotification(targetUser.email, emailSubject, emailContent);

        // 8. Save notification to database for the user
        const formattedTime = new Date(startDateTime).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        try {
            await db.query(
                'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
                [userId, `Your pool reservation for ${formattedTime} has been created and confirmed by admin.`]
            );
        } catch (notifError) {
            console.log('Note: Could not save notification to database:', notifError.message);
        }

        res.status(201).json({
            message: 'Reservation created successfully.',
            reservation: {
                reservation_id: result.insertId,
                user_id: userId,
                user_name: `${targetUser.fName} ${targetUser.lName}`,
                start_time: startDateTime,
                end_time: endDateTime,
                guests: guestCount,
                status: 'approved'
            }
        });

    } catch (error) {
        console.error('Error creating admin reservation:', error);
        res.status(500).json({ message: 'Server error while creating reservation.' });
    }
});

/**
 * @route GET /api/reservations/admin/all
 * @description Admin views all reservations (pending, approved, rejected, cancelled).
 * @access Private (Admin)
 */
router.get('/admin/all', adminAuth, async (req, res) => {
    try {
        let allReservations;
        try {
            const sql = `
                SELECT 
                    r.reservation_id,
                    r.start_time,
                    r.end_time,
                    r.status,
                    r.guests,
                    r.created_at,
                    u.user_id AS renter_id,
                    u.fName,
                    u.lName,
                    u.email
                FROM reservations r
                JOIN users u ON r.user_id = u.user_id
                ORDER BY r.start_time DESC;
            `;
            [allReservations] = await db.query(sql);
        } catch (queryError) {
            // Fallback if guests column doesn't exist
            if (queryError.code === 'ER_BAD_FIELD_ERROR') {
                const sql = `
                    SELECT 
                        r.reservation_id,
                        r.start_time,
                        r.end_time,
                        r.status,
                        1 as guests,
                        r.created_at,
                        u.user_id AS renter_id,
                        u.fName,
                        u.lName,
                        u.email
                    FROM reservations r
                    JOIN users u ON r.user_id = u.user_id
                    ORDER BY r.start_time DESC;
                `;
                [allReservations] = await db.query(sql);
            } else {
                throw queryError;
            }
        }

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
 * @route GET /api/reservations/pool-settings
 * @description Public endpoint to get pool settings (max guests per slot).
 * @access Public (with auth - any logged in user)
 */
router.get('/pool-settings', auth, async (req, res) => {
    try {
        // Fetch the single row from the pool_settings table
        const [settings] = await db.query('SELECT * FROM pool_settings LIMIT 1');
        
        if (settings.length === 0) {
            // Return default settings if not initialized
            return res.json({ 
                max_people_slot_1: 10,
                max_people_slot_2: 10,
                max_people_slot_3: 10,
                max_people_slot_4: 10,
                max_guests: 10
            });
        }

        // Calculate the maximum guests allowed (use the highest slot value or a default)
        const maxGuests = Math.max(
            settings[0].max_people_slot_1 || 10,
            settings[0].max_people_slot_2 || 10,
            settings[0].max_people_slot_3 || 10,
            settings[0].max_people_slot_4 || 10
        );

        res.json({
            ...settings[0],
            max_guests: maxGuests
        });
    } catch (error) {
        console.error('Error fetching pool settings:', error);
        res.status(500).json({ message: 'Server error while fetching pool settings.' });
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

// ============================================
// SWIMMING LESSONS ENDPOINTS
// ============================================

/**
 * @route GET /api/reservations/admin/swimming-lessons
 * @description Admin views all swimming lessons.
 * @access Private (Admin)
 */
router.get('/admin/swimming-lessons', adminAuth, async (req, res) => {
    try {
        // Try to create table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS swimming_lessons (
                lesson_id INT AUTO_INCREMENT PRIMARY KEY,
                lesson_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                participants INT NOT NULL DEFAULT 1,
                notes VARCHAR(255),
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(user_id)
            )
        `);

        const [lessons] = await db.query(`
            SELECT 
                sl.lesson_id,
                sl.lesson_date,
                sl.start_time,
                sl.end_time,
                sl.participants,
                sl.notes,
                sl.created_at,
                u.fName as admin_fName,
                u.lName as admin_lName
            FROM swimming_lessons sl
            LEFT JOIN users u ON sl.created_by = u.user_id
            ORDER BY sl.lesson_date DESC, sl.start_time ASC
        `);

        res.json(lessons);
    } catch (error) {
        console.error('Error fetching swimming lessons:', error);
        res.status(500).json({ message: 'Server error while fetching swimming lessons.' });
    }
});

/**
 * @route POST /api/reservations/admin/swimming-lessons
 * @description Admin creates a swimming lesson slot.
 * @access Private (Admin)
 */
router.post('/admin/swimming-lessons', adminAuth, async (req, res) => {
    const { date, startTime, endTime, participants, notes } = req.body;
    const adminId = req.user.id;

    // Validation
    if (!date || !startTime || !endTime || !participants) {
        return res.status(400).json({ message: 'Date, start time, end time, and participants are required.' });
    }

    const participantCount = parseInt(participants);
    if (participantCount < 1) {
        return res.status(400).json({ message: 'Participants must be at least 1.' });
    }

    try {
        // Ensure table exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS swimming_lessons (
                lesson_id INT AUTO_INCREMENT PRIMARY KEY,
                lesson_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                participants INT NOT NULL DEFAULT 1,
                notes VARCHAR(255),
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(user_id)
            )
        `);

        // Insert the swimming lesson
        const [result] = await db.query(
            `INSERT INTO swimming_lessons (lesson_date, start_time, end_time, participants, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [date, startTime, endTime, participantCount, notes || null, adminId]
        );

        // Log the admin action
        const action = `created swimming lesson for ${date} (${startTime}-${endTime}) with ${participantCount} participants.`;
        await logAdminAction(adminId, action);

        res.status(201).json({
            message: 'Swimming lesson created successfully.',
            lesson: {
                lesson_id: result.insertId,
                lesson_date: date,
                start_time: startTime,
                end_time: endTime,
                participants: participantCount,
                notes: notes || null
            }
        });
    } catch (error) {
        console.error('Error creating swimming lesson:', error);
        res.status(500).json({ message: 'Server error while creating swimming lesson.' });
    }
});

/**
 * @route DELETE /api/reservations/admin/swimming-lessons/:id
 * @description Admin deletes a swimming lesson.
 * @access Private (Admin)
 */
router.delete('/admin/swimming-lessons/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;

    try {
        // Get lesson info for logging
        const [lesson] = await db.query(
            'SELECT lesson_date, start_time, participants FROM swimming_lessons WHERE lesson_id = ?',
            [id]
        );

        if (lesson.length === 0) {
            return res.status(404).json({ message: 'Swimming lesson not found.' });
        }

        // Delete the lesson
        await db.query('DELETE FROM swimming_lessons WHERE lesson_id = ?', [id]);

        // Log the admin action
        const lessonInfo = lesson[0];
        const action = `deleted swimming lesson ID ${id} for ${lessonInfo.lesson_date} with ${lessonInfo.participants} participants.`;
        await logAdminAction(adminId, action);

        res.json({ message: 'Swimming lesson deleted successfully.' });
    } catch (error) {
        console.error('Error deleting swimming lesson:', error);
        res.status(500).json({ message: 'Server error while deleting swimming lesson.' });
    }
});

module.exports = router;