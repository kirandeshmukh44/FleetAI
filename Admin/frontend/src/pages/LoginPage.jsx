import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MdVisibility, MdVisibilityOff, MdShield } from 'react-icons/md';
import { isValidPassword } from '../utils/validation';
import { errorMessage } from '../services/api';

const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!isValidPassword(password)) {
      setError('Password must be between 6 and 128 characters.');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to sign in.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="admin-brand-mark">F</span>
          <span className="admin-brand-text">
            <strong>FleetAI</strong>
            <span>Admin Control</span>
          </span>
        </div>

        <h1 className="login-title">Administrator sign in</h1>
        <p className="login-subtitle">
          Restricted access. Only accounts with the <strong>superadmin</strong> role can manage the platform.
        </p>

        {error ? (
          <div className="alert alert-error" role="alert">
            <MdShield size={17} />
            <span>{error}</span>
          </div>
        ) : null}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              className="input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="superadmin"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="admin-password">Password</label>
            <div className="reveal-row">
              <input
                id="admin-password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <MdVisibilityOff size={17} /> : <MdVisibility size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Signing in…' : 'Enter admin console'}
          </button>
        </form>

        <div className="login-demo">
          <strong>First time here?</strong>
          <span>
            Create the initial superadmin from the admin backend, then sign in with those credentials.
          </span>
          <code>python seed_admin.py</code>
        </div>

        <p className="login-foot">FleetAI · AI-Based Smart Transportation Platform</p>
      </div>
    </div>
  );
};

export default LoginPage;
