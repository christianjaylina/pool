import React, { useState, useEffect, useCallback } from 'react';
import { fetchAllRenters, updateRenterStatus } from '../../api/userApi';

const ManageUsers = () => {
    const [renters, setRenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadRenters = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAllRenters();
            setRenters(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load renter accounts.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRenters();
    }, [loadRenters]);


    const handleStatusToggle = async (userId, currentStatus) => {
        const newStatus = !currentStatus;
        const action = newStatus ? 'activate' : 'deactivate';

        if (!window.confirm(`Are you sure you want to ${action} user ID ${userId}?`)) {
            return;
        }

        try {
            await updateRenterStatus(userId, newStatus);
            // Optimistically update the local state for immediate feedback
            setRenters(prevRenters => 
                prevRenters.map(renter => 
                    renter.user_id === userId ? { ...renter, is_active: newStatus } : renter
                )
            );
        } catch (err) {
            alert(`Error updating status: ${err.response?.data?.message || 'Server error.'}`);
            // Reload if the update failed
            loadRenters(); 
        }
    };

    if (loading) return <h3>Loading Renter Accounts...</h3>;
    if (error) return <h3 className="error-message">Error: {error}</h3>;

    return (
        <div className="manage-users">
            <h3>Renter Account Management</h3>
            <p>View and control the activation status of all renters.</p>

            {renters.length === 0 ? (
                <p>No renter accounts found.</p>
            ) : (
                <table className="user-management-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renters.map((renter) => (
                            <tr key={renter.user_id} className={renter.is_active ? '' : 'inactive-row'}>
                                <td>{renter.user_id}</td>
                                <td>{renter.fName} {renter.lName}</td>
                                <td>{renter.email}</td>
                                <td>
                                    <span className={`status-badge ${renter.is_active ? 'status-approved' : 'status-rejected'}`}>
                                        {renter.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </td>
                                <td>{new Date(renter.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button 
                                        onClick={() => handleStatusToggle(renter.user_id, renter.is_active)}
                                        className={renter.is_active ? 'btn-reject' : 'btn-approve'}
                                        title={renter.is_active ? 'Deactivate this user' : 'Activate this user'}
                                    >
                                        {renter.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ManageUsers;