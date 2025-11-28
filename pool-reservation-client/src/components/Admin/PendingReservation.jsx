import React, { useState, useEffect, useCallback } from 'react';
import { fetchPendingReservations, updateReservationStatus } from '../../api/reservationApi';

const PendingReservations = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadReservations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchPendingReservations();
            setReservations(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load pending reservations.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReservations();
    }, [loadReservations]);
    
    // Utility to format date/time
    const formatDateTime = (dateTime) => {
        const date = new Date(dateTime);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        };
        return date.toLocaleDateString('en-US', options);
    };


    const handleStatusUpdate = async (reservationId, newStatus) => {
        if (!window.confirm(`Are you sure you want to ${newStatus} reservation ID ${reservationId}?`)) {
            return;
        }

        try {
            await updateReservationStatus(reservationId, newStatus);
            // Refresh the list after successful update
            loadReservations(); 
        } catch (err) {
            alert(`Error updating status: ${err.response?.data?.message || 'Server error.'}`);
            // Reload in case of conflict (e.g., slot became blocked)
            loadReservations();
        }
    };

    if (loading) return <h3>Loading Pending Requests...</h3>;
    if (error) return <h3 className="error-message">Error: {error}</h3>;

    return (
        <div className="pending-reservations">
            <h3>Pending Reservation Requests</h3>
            <p>Review and act on all new booking requests below.</p>

            {reservations.length === 0 ? (
                <p>🎉 No pending reservations requiring approval!</p>
            ) : (
                <table className="reservation-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Renter</th>
                            <th>Time Slot</th>
                            <th>Requested At</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations.map((res) => (
                            <tr key={res.reservation_id}>
                                <td>{res.reservation_id}</td>
                                <td>{res.fName} {res.lName} ({res.email})</td>
                                <td>
                                    {formatDateTime(res.start_time)} - {formatDateTime(res.end_time).split(', ')[1]}
                                </td>
                                <td>{new Date(res.requested_at).toLocaleDateString()}</td>
                                <td>
                                    <button 
                                        onClick={() => handleStatusUpdate(res.reservation_id, 'approved')}
                                        className="btn-approve"
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        onClick={() => handleStatusUpdate(res.reservation_id, 'rejected')}
                                        className="btn-reject"
                                    >
                                        Reject
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

export default PendingReservations;