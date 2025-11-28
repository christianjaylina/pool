import axios from 'axios';

// --- Admin User Management Endpoints ---

/**
 * Fetches all renter accounts for administration.
 */
export const fetchAllRenters = async () => {
    const response = await axios.get('/api/users/admin/renters');
    return response.data;
};

/**
 * Updates the activation status of a specific renter.
 * @param {number} userId - ID of the renter to update.
 * @param {boolean} isActive - The new activation status (true/false).
 */
export const updateRenterStatus = async (userId, isActive) => {
    const response = await axios.put(`/api/users/admin/status/${userId}`, { isActive });
    return response.data;
};