import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerRenter } from '../../api/authApi';

const Register = () => {
  const [fName, setFName] = useState('');
  const [lName, setLName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      // Note: We are only implementing Renter registration here as per requirement
      // Admin accounts should be created manually in the database for security.
      await registerRenter({ fName, lName, email, password });

      setMessage('Registration successful! You can now log in.');
      setTimeout(() => navigate('/login'), 2000);

    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Renter Registration</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <p className="error-message error">{error}</p>}
        {message && <p className="success-message success">{message}</p>}

        <div className="form-group">
          <label htmlFor="fName">First Name</label>
          <input type="text" id="fName" value={fName} onChange={(e) => setFName(e.target.value)} required disabled={loading} />
        </div>
        
        <div className="form-group">
          <label htmlFor="lName">Last Name</label>
          <input type="text" id="lName" value={lName} onChange={(e) => setLName(e.target.value)} required disabled={loading} />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log In</Link>
      </p>
    </div>
  );
};

export default Register;