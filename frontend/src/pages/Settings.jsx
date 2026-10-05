import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/settings.css';
import { VALIDATION, validateEmail, validatePassword } from '../utils/validation';

const Settings = () => {
  const { user, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  // Profile Form State
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // System Form State
  const [companyName, setCompanyName] = useState('FleetAI Transportation');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [darkMode, setDarkMode] = useState(true);

  // Risk Thresholds State
  const [highRisk, setHighRisk] = useState(70);
  const [medRisk, setMedRisk] = useState(50);
  const [speedLimit, setSpeedLimit] = useState(80);
  const [harshBrake, setHarshBrake] = useState(3.0);

  // Notifications State
  const [notifications, setNotifications] = useState({
    highRiskAlerts: true,
    fuelAlerts: true,
    offlineAlerts: true,
    harshAlerts: true,
    emailAlerts: false,
    smsAlerts: false,
  });

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice({ type: '', text: '' });
    if (!VALIDATION.username.test(username.trim())) {
      setNotice({ type: 'error', text: 'Username must start with a letter and be 3–30 characters.' });
      setSaving(false);
      return;
    }
    if (!validateEmail(email)) {
      setNotice({ type: 'error', text: 'Enter a valid email address.' });
      setSaving(false);
      return;
    }
    if (newPassword && !validatePassword(newPassword)) {
      setNotice({ type: 'error', text: 'New password must be between 6 and 128 characters.' });
      setSaving(false);
      return;
    }
    try {
      const payload = { username, email };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      const response = await api.put('/auth/profile', payload);
      setNotice({ type: 'success', text: response.data?.message || 'Profile updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      if (checkAuth) await checkAuth();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update profile settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenericSave = (label) => {
    setNotice({ type: 'success', text: `${label} preferences saved successfully.` });
    setTimeout(() => setNotice({ type: '', text: '' }), 4000);
  };

  const tabs = [
    { id: 'profile', name: 'Profile Settings', icon: '👤' },
    { id: 'system', name: 'System Settings', icon: '⚙️' },
    { id: 'risk', name: 'Risk Thresholds', icon: '⚠️' },
    { id: 'notifications', name: 'Notification Rules', icon: '🔔' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-eyebrow"><span /> PREFERENCES & CONFIGURATION</div>
        <h1>Workspace Settings<span>.</span></h1>
        <p>Configure user credentials, telemetry thresholds, and system preferences.</p>
      </div>

      {notice.text && (
        <div className={`settings-notice ${notice.type}`} role="alert">
          <span>{notice.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{notice.text}</span>
        </div>
      )}

      <div className="settings-layout">
        {/* Navigation Tabs */}
        <aside className="settings-nav" aria-label="Settings categories">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setNotice({ type: '', text: '' });
              }}
              className={`settings-tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
            >
              <span className="settings-tab-icon">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </aside>

        {/* Content Section */}
        <section className="settings-content-card">
          {activeTab === 'profile' && (
            <div>
              <div className="settings-section-head">
                <h2>Account Profile</h2>
                <p>Manage your account credentials, role details, and security.</p>
              </div>

              <div className="settings-profile-badge-row">
                <div className="settings-avatar-large">
                  {user?.username?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="settings-profile-meta">
                  <h3>{user?.username || 'Administrator'}</h3>
                  <p>{user?.email || 'admin@fleetai.com'}</p>
                  <span className="settings-role-tag">
                    Role: {user?.role || 'Fleet Admin'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit}>
                <div className="settings-form-grid">
                  <div className="settings-field">
                    <label className="settings-label">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="settings-input"
                      required
                    />
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="settings-input"
                      required
                    />
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Current Password</label>
                    <input
                      type="password"
                      placeholder="Required only to change password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="settings-input"
                    />
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">New Password</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="settings-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="settings-submit-btn"
                >
                  {saving ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'system' && (
            <div>
              <div className="settings-section-head">
                <h2>System Configuration</h2>
                <p>Configure regional preferences, timezones, and display styling.</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleGenericSave('System'); }}>
                <div className="settings-form-grid">
                  <div className="settings-field">
                    <label className="settings-label">Organization Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="settings-input"
                    />
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="settings-select"
                    >
                      <option>Asia/Kolkata (IST)</option>
                      <option>UTC</option>
                      <option>America/New_York (EST)</option>
                      <option>Europe/London (GMT)</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Date Format</label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="settings-select"
                    >
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Display Theme</label>
                    <label className="settings-checkbox-card">
                      <span>Dark Telemetry Mode</span>
                      <input
                        type="checkbox"
                        checked={darkMode}
                        onChange={(e) => setDarkMode(e.target.checked)}
                      />
                    </label>
                  </div>
                </div>

                <button type="submit" className="settings-submit-btn">
                  Save System Configuration
                </button>
              </form>
            </div>
          )}

          {activeTab === 'risk' && (
            <div>
              <div className="settings-section-head">
                <h2>AI Risk Thresholds</h2>
                <p>Set sensitivity levels for machine learning safety alerts and speeding.</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleGenericSave('Risk thresholds'); }}>
                <div className="settings-form-grid">
                  <div className="settings-field">
                    <label className="settings-label">High Risk Severity Threshold ({highRisk}%)</label>
                    <div className="settings-range-box">
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={highRisk}
                        onChange={(e) => setHighRisk(Number(e.target.value))}
                      />
                      <div className="settings-range-labels">
                        <span>50%</span>
                        <span>{highRisk}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Medium Risk Warning Threshold ({medRisk}%)</label>
                    <div className="settings-range-box">
                      <input
                        type="range"
                        min="20"
                        max="65"
                        value={medRisk}
                        onChange={(e) => setMedRisk(Number(e.target.value))}
                      />
                      <div className="settings-range-labels">
                        <span>20%</span>
                        <span>{medRisk}%</span>
                        <span>65%</span>
                      </div>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Speeding Alert Limit (km/h)</label>
                    <input
                      type="number"
                      value={speedLimit}
                      onChange={(e) => setSpeedLimit(Number(e.target.value))}
                      className="settings-input"
                    />
                  </div>

                  <div className="settings-field">
                    <label className="settings-label">Harsh Braking G-Force (m/s²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={harshBrake}
                      onChange={(e) => setHarshBrake(Number(e.target.value))}
                      className="settings-input"
                    />
                  </div>
                </div>

                <button type="submit" className="settings-submit-btn">
                  Save Risk Thresholds
                </button>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <div className="settings-section-head">
                <h2>Notification Preferences</h2>
                <p>Choose which fleet alerts dispatch notifications to your dashboard.</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleGenericSave('Notification rules'); }}>
                <div className="settings-form-grid">
                  {[
                    { key: 'highRiskAlerts', label: 'High Risk Incident Alerts' },
                    { key: 'fuelAlerts', label: 'Fuel Anomaly & Level Alerts' },
                    { key: 'offlineAlerts', label: 'Vehicle Offline / Disconnect' },
                    { key: 'harshAlerts', label: 'Harsh Braking & Acceleration' },
                    { key: 'emailAlerts', label: 'Email Digest Notifications' },
                    { key: 'smsAlerts', label: 'SMS Critical Priority Alerts' },
                  ].map((item) => (
                    <label key={item.key} className="settings-checkbox-card">
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={(e) =>
                          setNotifications((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>

                <button type="submit" className="settings-submit-btn">
                  Save Notification Rules
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Settings;
