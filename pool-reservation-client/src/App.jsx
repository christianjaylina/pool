// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import RenterDashboard from './components/Renter/RenterDashboard';
import ReservationHistory from './components/Renter/ReservationHistory';
import AdminDashboard from './components/Admin/AdminDashboard';
import PendingReservations from './components/Admin/PendingReservation';
import ManageUsers from './components/Admin/ManageUsers';
import PoolSettings from './components/Admin/PoolSettings';
import AdminAudit from './components/Admin/AdminAudit';

// Placeholder Components
const NotFound = () => <h1>404 - Page Not Found</h1>;

// Custom Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  // 🛑 FIX: Destructure initialLoading state
  const { isAuthenticated, user, loading, initialLoading } = useAuth();
  
  // 🛑 FIX: Wait for initial loading (local storage check) to complete
  if (initialLoading || loading) {
    return <div>Loading user session...</div>; // Show a loading indicator while checking session
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if the user's role is permitted for this route
  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect unauthorized users to their appropriate dashboard or a forbidden page
    const redirectPath = user.role === 'admin' ? '/admin/reservations' : '/renter/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Renter Protected Routes */}
          <Route path="/renter/dashboard" element={
            <ProtectedRoute allowedRoles={['renter']}>
              <RenterDashboard />
            </ProtectedRoute>
          } />

          <Route path="/renter/history" element={
            <ProtectedRoute allowedRoles={['renter']}>
              <ReservationHistory />
            </ProtectedRoute>
          } />

          {/* Admin Protected Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          >
            {/* Nested Admin Routes */}
            <Route index element={<Navigate to="reservations" replace />} />
            <Route path="reservations" element={<PendingReservations />} /> 
            <Route path="users" element={<ManageUsers />} />
            <Route path="settings" element={<PoolSettings />} />
            <Route path="audit" element={<AdminAudit />} />
          </Route>
          
          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;