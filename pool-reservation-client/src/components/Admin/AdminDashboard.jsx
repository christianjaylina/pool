import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Utility function for active NavLink style
    const activeLink = ({ isActive }) => 
        isActive ? { fontWeight: 'bold', color: '#107c10' } : undefined;

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>Admin Panel</h1>
                <p>Welcome, {user?.fName}. You are managing Luxuria Bacaca Resort.</p>
                <button onClick={() => {
                    logout();
                    navigate('/login');
                }}>Log Out</button>
            </header>
            
            <nav className="admin-nav">
                <NavLink to="reservations" style={activeLink}>
                    Pending Reservations
                </NavLink>
                <NavLink to="users" style={activeLink}>
                    Manage Renters
                </NavLink>
                <NavLink to="settings" style={activeLink}>
                    Pool Settings
                </NavLink>
                <NavLink to="audit" style={activeLink}>
                    Audit Logs
                </NavLink>
            </nav>

            <main className="admin-content">
                {/* Outlet renders the content of the child routes (e.g., PendingReservations) */}
                <Outlet />
            </main>
        </div>
    );
};

export default AdminDashboard;