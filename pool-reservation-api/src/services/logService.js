const db = require('../config/db');

/**
 * Inserts a new entry into the admin_logs table.
 * @param {number} adminUserId - The user_id of the admin performing the action.
 * @param {string} action - Description of the action performed.
 */
const logAdminAction = async (adminUserId, action) => {
    try {
        const sql = `
            INSERT INTO admin_logs (admin_user_id, action)
            VALUES (?, ?)
        `;
        await db.query(sql, [adminUserId, action]);
        console.log(`[Admin Logged] User ${adminUserId}: ${action}`);
    } catch (error) {
        console.error('ERROR logging admin action:', error);
        // We generally do not want logging failure to halt the main operation
    }
};

module.exports = { logAdminAction };