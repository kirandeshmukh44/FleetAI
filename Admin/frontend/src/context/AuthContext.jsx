import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAuthToken, getStoredToken, errorMessage } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (active) setUser(data);
      })
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const handleUnauthorized = () => logout();
    window.addEventListener('admin:unauthorized', handleUnauthorized);
    return () => {
      active = false;
      window.removeEventListener('admin:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    setAuthToken(data.access_token);
    setUser(data.user);
    setLoading(false);
    return data.user;
  };

  const changePassword = async (currentPassword, newPassword) => {
    await api.put('/auth/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, errorMessage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
