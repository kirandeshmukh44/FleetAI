import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdDarkMode, MdLightMode } from 'react-icons/md';
import '../styles/auth.css';
import { validatePassword } from '../utils/validation';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('fleet-theme') || 'light');
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('fleet-theme', theme);
  }, [theme]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!validatePassword(password)) {
      setError('Password must be between 6 and 128 characters.');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* Left visual panel */}
      <div className="auth-visual-panel">
        <div className="auth-visual-bg" />
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <Link className="auth-brand-logo" to="/">
            <span className="auth-brand-icon">
              <i /><i /><i />
            </span>
            <span>Fleet<span>AI</span></span>
          </Link>
          <div className="auth-visual-headline">
            <span className="auth-badge"><span className="auth-badge-dot" /> TRANSPORT INTELLIGENCE</span>
            <h1>Every mile.<br /><span>Every insight.</span></h1>
            <p>AI-powered fleet management that brings vehicle tracking, driver behavior analysis, and fuel analytics into one unified workspace.</p>
          </div>
          <div className="auth-visual-stats">
            <div className="auth-stat">
              <strong>Real-time</strong>
              <span>GPS Tracking</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <strong>AI-driven</strong>
              <span>Risk Analysis</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <strong>Smart</strong>
              <span>Fuel Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <button
          className="auth-theme-toggle"
          type="button"
          onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <MdLightMode size={17} /> : <MdDarkMode size={17} />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <Link className="auth-back-btn" to="/">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to home
        </Link>

        <div className="auth-form-container">
          {/* Mobile brand */}
          <Link className="auth-mobile-logo" to="/">
            <span className="auth-brand-icon small"><i /><i /><i /></span>
            <span>Fleet<span>AI</span></span>
          </Link>

          <div className="auth-form-header">
            <span className="auth-form-tag">FLEET WORKSPACE</span>
            <h2>Welcome back<span className="auth-dot">.</span></h2>
            <p>Sign in to access your fleet operations dashboard.</p>
          </div>

          {error && (
            <div className="auth-alert error" role="alert">
              <span className="auth-alert-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </span>
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-username">Username</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M2.5 13.5C2.5 11 5 9 8 9s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </span>
                <input
                  id="login-username"
                  type="text"
                  className="auth-input"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-password">Password</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3"/>
                      <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3"/>
                      <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="auth-quick-demo fresh-account-note">
              <span>Fresh workspace:</span>
              <Link to="/register">Create your first account</Link>
            </div>

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="auth-spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  Enter workspace
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="auth-switch-text">
            Don't have an account?{' '}
            <Link to="/register" className="auth-switch-link">Create one free →</Link>
          </p>

          <div className="auth-security-badge">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1.5L2 3.5v3.5c0 2.7 2 5.2 5 5.9 3-0.7 5-3.2 5-5.9V3.5L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Your session is secured with JWT authentication</span>
          </div>
        </div>

        <div className="auth-form-footer">
          FleetAI &middot; Smart Transportation Platform
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
