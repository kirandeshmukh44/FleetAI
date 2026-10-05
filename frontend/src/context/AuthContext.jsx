import { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      checkAuth(token);
    } else {
      setLoading(false);
    }

    const handleUnauthorized = (event) => {
      if (localStorage.getItem('token') !== event.detail?.token) return;
      localStorage.removeItem('token');
      setAuthToken(null);
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const checkAuth = async (sessionToken = localStorage.getItem('token')) => {
    const token = sessionToken;
    if (token) {
      setAuthToken(token);
      try {
        const response = await api.get('/auth/me');
        if (localStorage.getItem('token') === token) {
          setUser(response.data);
        }
      } catch {
        if (localStorage.getItem('token') === token) {
          localStorage.removeItem('token');
          setAuthToken(null);
          setUser(null);
        }
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setAuthToken(access_token);
    setUser(userData);
    setLoading(false);
    return response.data;
  };

  const register = async (username, fullName, email, password) => {
    const response = await api.post('/auth/register', { username, full_name: fullName, email, password });
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

