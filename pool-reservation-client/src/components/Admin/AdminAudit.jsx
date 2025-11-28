import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminLogs, fetchAllReservations } from '../../api/reservationApi';

const AdminAudit = () => {
    const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'reservations'
    const [auditLogs, setAuditLogs] = useState([]);
    const [allReservations, setAllReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const formatDateTime = (dateTime) => {
        const date = new Date(dateTime);
        const options = { 
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const logsData = await fetchAdminLogs();
            const resData = await fetchAllReservations();
            
            setAuditLogs(logsData);
            setAllReservations(resData);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load audit data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
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


    if (loading) return <h3>Loading Audit Data...</h3>;
    if (error) return <h3 className="error-message">Error: {error}</h3>;

    return (
        <div className="admin-audit">
            <h3>System Audit and History</h3>
            
            {/* Tab Navigation */}
            <div className="tab-nav">
                <button 
                    className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logs')}
                >
                    Admin Activity Logs ({auditLogs.length})
                </button>
                <button 
                    className={`tab-button ${activeTab === 'reservations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reservations')}
                >
                    All Reservations History ({allReservations.length})
                </button>
            </div>

            <div className="tab-content">
                {/* 1. Admin Activity Logs View */}
                {activeTab === 'logs' && (
                    <div className="audit-logs-view">
                        <h4>Admin Action History</h4>
                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th>Log ID</th>
                                    <th>Admin User</th>
                                    <th>Action</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map((log) => (
                                    <tr key={log.log_id}>
                                        <td>{log.log_id}</td>
                                        <td>{log.fName} {log.lName}</td>
                                        <td>{log.action}</td>
                                        <td>{formatDateTime(log.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* 2. All Reservations History View */}
                {activeTab === 'reservations' && (
                    <div className="all-reservations-view">
                        <h4>Complete Reservation History</h4>
                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th>Res ID</th>
                                    <th>Renter</th>
                                    <th>Time Slot</th>
                                    <th>Status</th>
                                    <th>Requested</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allReservations.map((res) => (
                                    <tr key={res.reservation_id}>
                                        <td>{res.reservation_id}</td>
                                        <td>{res.fName} {res.lName} (ID: {res.renter_id})</td>
                                        <td>
                                            {formatDateTime(res.start_time)} - {new Date(res.end_time).toLocaleTimeString()}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${getStatusClass(res.status)}`}>
                                                {res.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>{new Date(res.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAudit;