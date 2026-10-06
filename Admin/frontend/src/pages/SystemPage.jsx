import { useEffect, useState, useCallback } from 'react';
import { MdHealthAndSafety, MdSave, MdNotificationsActive, MdCheckCircle, MdLock } from 'react-icons/md';

import PageHeader from '../components/PageHeader';
import StatTile from '../components/StatTile';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatNumber, formatRelative } from '../utils/format';
import { isValidPassword } from '../utils/validation';

const SystemPage = () => {
  const { user, changePassword } = useAuth();
  const [info, setInfo] = useState(null);
  const [settings, setSettings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [drafts, setDrafts] = useState({});
  const [sweeping, setSweeping] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [infoRes, settingsRes, notesRes] = await Promise.all([
        api.get('/system/info'),
        api.get('/system/settings'),
        api.get('/system/notifications'),
      ]);
      setInfo(infoRes.data);
      setSettings(settingsRes.data);
      setNotifications(notesRes.data);
      setDrafts(
        settingsRes.data.reduce((accumulator, item) => ({ ...accumulator, [item.key]: item.raw_value }), {}),
      );
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load system configuration.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSetting = async (key) => {
    setSavingKey(key);
    setError('');
    try {
      await api.put(`/system/settings/${key}`, { value: drafts[key] });
      setNotice(`Setting "${key}" updated.`);
      load();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to save the setting.'));
    } finally {
      setSavingKey('');
    }
  };

  const runSweep = async () => {
    setSweeping(true);
    setError('');
    try {
      const { data } = await api.post('/system/check');
      setNotice(
        data.raised > 0
          ? `Health sweep complete — ${data.raised} new alert(s) raised.`
          : 'Health sweep complete — no new issues detected.',
      );
      load();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Health sweep failed.'));
    } finally {
      setSweeping(false);
    }
  };

  const resolveNotification = async (notification) => {
    try {
      await api.post(`/system/notifications/${notification.id}/resolve`);
      setNotice(`Alert "${notification.title}" resolved.`);
      load();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to resolve the alert.'));
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    if (!isValidPassword(passwords.next)) {
      setPasswordError('New password must be between 6 and 128 characters.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwords.current === passwords.next) {
      setPasswordError('New password must differ from the current password.');
      return;
    }

    setPasswordSaving(true);
    setPasswordError('');
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswordOpen(false);
      setPasswords({ current: '', next: '', confirm: '' });
      setNotice('Your admin password has been updated.');
    } catch (requestError) {
      setPasswordError(errorMessage(requestError, 'Unable to change the password.'));
    } finally {
      setPasswordSaving(false);
    }
  };

  const openAlerts = notifications.filter((note) => !note.is_resolved);
  const tableCounts = info?.table_counts || {};

  const notificationColumns = [
    {
      key: 'title',
      header: 'Alert',
      render: (row) => (
        <>
          <div className="cell-primary">{row.title}</div>
          <div className="cell-sub">{row.message}</div>
        </>
      ),
    },
    { key: 'severity', header: 'Severity', render: (row) => <Badge value={row.severity} /> },
    { key: 'source', header: 'Source', render: (row) => <span className="text-sm">{row.source || '—'}</span> },
    { key: 'created_at', header: 'Raised', render: (row) => <span className="text-xs">{formatRelative(row.created_at)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) =>
        row.is_resolved ? (
          <Badge value="Resolved" tone="success" />
        ) : (
          <button type="button" className="btn btn-sm" onClick={() => resolveNotification(row)}>
            <MdCheckCircle size={15} />
            Resolve
          </button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="System Configuration"
        description="Runtime environment, platform settings and operator alerting for the FleetAI admin service."
        actions={
          <>
            <button type="button" className="btn" onClick={() => setPasswordOpen(true)}>
              <MdLock size={16} />
              Change password
            </button>
            <button type="button" className="btn btn-primary" onClick={runSweep} disabled={sweeping}>
              {sweeping ? <span className="spinner" /> : <MdHealthAndSafety size={16} />}
              Run health check
            </button>
          </>
        }
      />

      {notice ? <Alert tone="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert tone="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="admin-grid cols-4">
        {loading && !info ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 116, borderRadius: 14 }} />
          ))
        ) : (
          <>
            <StatTile label="API Version" value={info?.api_version || '—'} icon={MdHealthAndSafety} tone="#00c2ff" hint={info?.service || ''} />
            <StatTile label="Python" value={info?.python_version || '—'} icon={MdHealthAndSafety} tone="#00d4a8" hint={info?.platform || ''} />
            <StatTile label="Database" value={String(info?.database || '—').toUpperCase()} icon={MdHealthAndSafety} tone="#1677ff" hint="shared with main backend" />
            <StatTile label="Open Alerts" value={formatNumber(openAlerts.length)} icon={MdNotificationsActive} tone={openAlerts.length ? '#ef4444' : '#22c55e'} hint="unresolved notifications" />
          </>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Runtime Environment</h2>
            <p>Where this service is running and what it is connected to</p>
          </div>
        </div>
        <div className="detail-list">
          <div className="detail-item"><span>Service</span><strong>{info?.service || '—'}</strong></div>
          <div className="detail-item"><span>Database file</span><strong className="mono text-xs">{info?.database_path || '—'}</strong></div>
          <div className="detail-item"><span>Main backend</span><strong className="mono text-xs">{info?.main_backend || '—'}</strong></div>
          <div className="detail-item"><span>Session lifetime</span><strong>{info?.jwt_expiry_seconds ? `${Math.round(info.jwt_expiry_seconds / 3600)} hours` : '—'}</strong></div>
          <div className="detail-item"><span>Server time</span><strong>{formatDate(info?.server_time)}</strong></div>
          <div className="detail-item"><span>Signed in as</span><strong>{user?.username} ({user?.role})</strong></div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Database Contents</h2>
            <p>Row counts across the shared platform database</p>
          </div>
        </div>
        <div className="detail-list">
          {Object.entries(tableCounts).map(([name, count]) => (
            <div className="detail-item" key={name}>
              <span>{name.replace(/_/g, ' ')}</span>
              <strong>{formatNumber(count)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Platform Settings</h2>
            <p>Runtime values shared with the admin service</p>
          </div>
        </div>
        {loading && settings.length === 0 ? (
          <div className="skeleton" style={{ height: 150 }} />
        ) : (
          <div className="table-scroll">
            <table className="admin-table" style={{ minWidth: 640 }}>
              <thead>
                <tr><th>Key</th><th>Description</th><th>Type</th><th>Value</th><th>Last updated</th><th /></tr>
              </thead>
              <tbody>
                {settings.map((setting) => (
                  <tr key={setting.key}>
                    <td className="mono cell-primary">{setting.key}</td>
                    <td className="text-sm muted">{setting.description}</td>
                    <td><Badge value={setting.value_type} tone="neutral" /></td>
                    <td>
                      {setting.value_type === 'boolean' ? (
                        <select
                          className="select"
                          value={drafts[setting.key] ?? String(setting.raw_value)}
                          onChange={(event) => setDrafts({ ...drafts, [setting.key]: event.target.value })}
                          aria-label={setting.key}
                        >
                          <option value="false">false</option>
                          <option value="true">true</option>
                        </select>
                      ) : (
                        <input
                          className="input"
                          value={drafts[setting.key] ?? ''}
                          onChange={(event) => setDrafts({ ...drafts, [setting.key]: event.target.value })}
                          aria-label={setting.key}
                        />
                      )}
                    </td>
                    <td className="text-xs muted nowrap">
                      {setting.updated_by ? `${setting.updated_by} · ${formatRelative(setting.updated_at)}` : 'Never'}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => saveSetting(setting.key)}
                        disabled={savingKey === setting.key}
                      >
                        {savingKey === setting.key ? <span className="spinner" /> : <MdSave size={15} />}
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Operator Notifications</h2>
            <p>Alerts raised by health checks or operators</p>
          </div>
          <Badge value={`${openAlerts.length} open`} tone={openAlerts.length ? 'warning' : 'success'} />
        </div>
        <DataTable columns={notificationColumns} rows={notifications} loading={loading} emptyMessage="No notifications recorded." />
      </section>

      {passwordOpen ? (
        <Modal
          title="Change admin password"
          onClose={() => setPasswordOpen(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setPasswordOpen(false)} disabled={passwordSaving}>
                Cancel
              </button>
              <button type="submit" form="password-form" className="btn btn-primary" disabled={passwordSaving}>
                {passwordSaving ? <span className="spinner" /> : null}
                Update password
              </button>
            </>
          }
        >
          {passwordError ? <Alert tone="error">{passwordError}</Alert> : null}
          <form id="password-form" className="login-form" onSubmit={submitPassword}>
            <div className="field">
              <label htmlFor="pw-current">Current password</label>
              <input id="pw-current" className="input" type="password" value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="pw-next">New password</label>
              <input id="pw-next" className="input" type="password" value={passwords.next}
                onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="pw-confirm">Confirm new password</label>
              <input id="pw-confirm" className="input" type="password" value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} required />
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
};

export default SystemPage;
