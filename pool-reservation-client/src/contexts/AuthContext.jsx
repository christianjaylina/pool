import axios from 'axios';
import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser } from '../api/authApi';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Initialize state from local storage for persistence
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 🛑 FIX: State to track if the initial local storage check is complete
  const [initialLoading, setInitialLoading] = useState(true); 

  // Set the default Authorization header for all future Axios requests
  useEffect(() => {
    if (token) {
      // Set the token for subsequent requests
      axios.defaults.headers.common['x-auth-token'] = token;
      localStorage.setItem('token', token);
    } else {
      // Clear the token and local storage if the token is removed
      delete axios.defaults.headers.common['x-auth-token'];
      localStorage.removeItem('token');
      localStorage.removeItem('user'); // Also ensure user data is cleared
    }
  }, [token]);

  // 🛑 FIX: Run once on mount to mark the initial token loading phase as complete
  useEffect(() => {
    // The token and user state were set synchronously from localStorage during initialization,
    // but we use this effect to ensure the token-setting useEffect has run,
    // and then we mark the process as complete for the ProtectedRoute.
    setInitialLoading(false);
  }, []);


  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await loginUser({ email, password });
      
      const { token: newToken, user: userData } = response;
      
      setToken(newToken);
      setUser(userData);
      
      // Store user data (id, fName, role) in local storage
      localStorage.setItem('user', JSON.stringify(userData)); 

      return true;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    // The useEffect hook above will handle the localStorage cleanup
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    initialLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};