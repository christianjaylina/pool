import axios from 'axios';

// All requests here will be proxied to http://localhost:5000/api/auth

export const registerRenter = async (userData) => {
  const response = await axios.post('/api/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await axios.post('/api/auth/login', credentials);
  return response.data;
};