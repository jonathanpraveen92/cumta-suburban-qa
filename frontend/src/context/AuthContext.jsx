import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Set base URL for API queries
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configure axios interceptor for auth headers
  useEffect(() => {
    const token = localStorage.getItem('cumta_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser(token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (token) => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Session validation failed:', error.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { token, user: userData } = response.data;
      
      localStorage.setItem('cumta_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid username or password'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('cumta_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setLoading(false);
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post('/api/auth/reset-password', { currentPassword, newPassword });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to change password'
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
