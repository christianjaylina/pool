import React, { useState, useEffect } from 'react';
import { fetchRenterHistory } from '../../api/reservationApi';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const ReservationHistory = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getHistory = async () => {
            try {
                const data = await fetchRenterHistory();
                // Sort by start_time descending to show most recent/upcoming first
                setHistory(data.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)));
                setLoading(false);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch reservation history.');
                setLoading(false);
            }
        };

        getHistory();
    }, []);

    // Utility function to format status color
    const getStatusClass = (status) => {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'pending': return 'status-pending';
            case 'rejected':
            case 'cancelled': return 'status-rejected';
            default: return '';
        }
    };
    
    // Utility function to format date/time
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


    if (loading) {
        return <div className="history-container">Loading reservation history...</div>;
    }

    if (error) {
        return <div className="history-container error-message">Error: {error}</div>;
    }

    return (
        <div className="history-container">
            <h2>{user.fName}'s Reservation History</h2>
            <Link to="/renter/dashboard" className="back-link">&larr; Back to Booking</Link>
            
            <p className="note">Your reservations and requests are listed below.</p>

            {history.length === 0 ? (
                <p>You have not made any reservations yet.</p>
            ) : (
                <table className="reservation-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Time Slot</th>
                            <th>Requested At</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((reservation) => (
                            <tr key={reservation.reservation_id}>
                                <td>{reservation.reservation_id}</td>
                                <td>
                                    {formatDateTime(reservation.start_time)} to <br /> 
                                    {formatDateTime(reservation.end_time).split(', ')[1]} {/* Just show time for end date */}
                                </td>
                                <td>{new Date(reservation.created_at).toLocaleDateString()}</td>
                                <td>
                                    <span className={`status-badge ${getStatusClass(reservation.status)}`}>
                                        {reservation.status.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ReservationHistory;