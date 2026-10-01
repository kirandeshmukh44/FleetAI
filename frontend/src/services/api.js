import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Initialize default header from existing token
const initialToken = localStorage.getItem('token');
if (initialToken) {
  setAuthToken(initialToken);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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
    // Only dispatch auth:unauthorized if /auth/me returns 401 or response explicitly indicates expired/invalid token
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      const isAuthCheck = error.config?.url?.includes('/auth/me');
      const msg = error.response?.data?.msg || error.response?.data?.error || '';
      const isTokenExpired = typeof msg === 'string' && (
        msg.toLowerCase().includes('token') || 
        msg.toLowerCase().includes('expired') || 
        msg.toLowerCase().includes('signature')
      );

      if (isAuthCheck || isTokenExpired) {
        const authorization = error.config?.headers?.get?.('Authorization') || 
                              error.config?.headers?.Authorization || 
                              error.config?.headers?.authorization;
        const requestToken = authorization?.replace(/^Bearer\s+/i, '');
        const currentToken = localStorage.getItem('token');
        if (!requestToken || requestToken === currentToken) {
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { token: currentToken } }));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

