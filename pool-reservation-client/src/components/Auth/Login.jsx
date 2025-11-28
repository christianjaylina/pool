import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, user } = useAuth();
  const navigate = useNavigate();

useEffect(() => {
      // We only navigate if a user object exists (meaning they are logged in)
      if (user) {
          // Determine the correct dashboard path based on role
          const path = user.role === 'admin' ? '/admin/reservations' : '/renter/dashboard';
          
          // Navigate after the component has rendered
          navigate(path, { replace: true });
      }
  }, [user, navigate]); // Rerun this effect whenever 'user' changes.

  // 3. Optional: Prevent form flicker if the redirect is about to happen
  if (user) {
      return <div className="auth-container">Redirecting to dashboard...</div>;
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
    // Redirection happens automatically via the useEffect hook above upon successful login
  };

  return (
    <div className="auth-container">
      <h2>Renter/Admin Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <p className="error-message">{error}</p>}
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      <p>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
};

export default Login;