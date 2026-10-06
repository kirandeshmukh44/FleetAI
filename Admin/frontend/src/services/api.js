import axios from 'axios';

const TOKEN_KEY = 'admin_token';

export const api = axios.create({
  baseURL: '/api/admin',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

// Re-apply a persisted token after a page refresh.
const initialToken = getStoredToken();
if (initialToken) {
  setAuthToken(initialToken);
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    if (config.headers?.set) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isLogin = url.includes('/auth/login');

    // Only force a logout on a genuine session failure, never on a bad password.
    if (status === 401 && !isLogin) {
      window.dispatchEvent(new CustomEvent('admin:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/** Normalise a failed request into a readable message. */
export const errorMessage = (error, fallback = 'Something went wrong.') =>
  error?.response?.data?.error || error?.message || fallback;

export default api;
