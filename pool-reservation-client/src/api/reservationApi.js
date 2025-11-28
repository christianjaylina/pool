import axios from 'axios';

// All requests here will be proxied to http://localhost:5000/api/reservations

/**
 * Fetches available time slots for a specific date.
 * @param {string} date - Date in YYYY-MM-DD format.
 */
export const fetchAvailability = async (date) => {
    const response = await axios.get(`/api/reservations/availability/${date}`);
    return response.data;
};

/**
 * Submits a new reservation request.
 * @param {object} bookingData - Contains date, startTime, and endTime.
 */
export const requestReservation = async (bookingData) => {
    const response = await axios.post('/api/reservations/request', bookingData);
    return response.data;
};

/**
 * Fetches the renter's reservation history (past and upcoming).
 */
export const fetchRenterHistory = async () => {
    const response = await axios.get('/api/reservations/history');
    return response.data;
};

/**
 * Fetches all pending reservation requests for Admin approval.
 */
export const fetchPendingReservations = async () => {
    const response = await axios.get('/api/reservations/admin/pending');
    return response.data;
};

/**
 * Updates the status of a specific reservation.
 * @param {number} reservationId - ID of the reservation to update.
 * @param {string} newStatus - 'approved' or 'rejected'.
 */
export const updateReservationStatus = async (reservationId, newStatus) => {
    const response = await axios.put(`/api/reservations/admin/status/${reservationId}`, { newStatus });
    return response.data;
};

/**
 * Fetches all reservations (for auditing purposes).
 */
export const fetchAllReservations = async () => {
    const response = await axios.get('/api/reservations/admin/all');
    return response.data;
};

/**
 * Fetches the current pool configuration settings.
 */
//
export const fetchPoolSettings = async () => {
    const response = await axios.get('/api/reservations/admin/settings');
    return response.data;
};

/**
 * Updates the pool configuration settings.
 * @param {object} settingsData - New capacity values for all four slots.
 */
export const updatePoolSettings = async (settingsData) => {
    const response = await axios.put('/api/reservations/admin/settings', settingsData);
    return response.data;
};

/**
 * Fetches all detailed audit logs created by admins.
 */
export const fetchAdminLogs = async () => {
    const response = await axios.get('/api/reservations/admin/logs');
    return response.data;
};

/**
 * Fetches all reservations for auditing purposes (All statuses).
 */
// fetchAllReservations is already defined from a previous step (Step 1, Admin API Service)