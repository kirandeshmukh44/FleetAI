import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdDirectionsCar,
  MdElectricCar,
  MdPeople,
  MdWarning,
  MdLocalGasStation,
  MdNotificationsActive,
  MdRoute,
  MdRefresh,
  MdUpload,
  MdClose,
  MdLocationOn,
  MdAnalytics,
  MdSpeed,
} from 'react-icons/md';
import api from '../services/api';
import '../styles/dashboard.css';

const metricCards = [
  { key: 'total_vehicles',          label: 'Fleet Vehicles',       Icon: MdDirectionsCar,        tone: 'blue',   suffix: '' },
  { key: 'active_vehicles',         label: 'Active Vehicles',      Icon: MdElectricCar,          tone: 'mint',   suffix: '' },
  { key: 'total_drivers',           label: 'Registered Drivers',   Icon: MdPeople,               tone: 'violet', suffix: '' },
  { key: 'high_risk_drivers',       label: 'High Risk Drivers',    Icon: MdWarning,              tone: 'amber',  suffix: '' },
  { key: 'average_fuel_efficiency', label: 'Avg. Fuel Efficiency', Icon: MdLocalGasStation,      tone: 'cyan',   suffix: ' km/L', decimals: 1 },
  { key: 'risk_alerts',             label: 'Risk Alerts',          Icon: MdNotificationsActive,  tone: 'rose',   suffix: '' },
  { key: 'total_journeys',          label: 'Recorded Journeys',    Icon: MdRoute,                tone: 'blue',   suffix: '' },
];

const timeLabel = (date) => {
  if (!date) return 'Time unavailable';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return new Date(date).toLocaleDateString();
};

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [trackingData, setTrackingData] = useState([]);
  const [riskHistory, setRiskHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dataType, setDataType] = useState('vehicles');
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    setLoadError('');
    const [summaryResult, trackingResult, riskResult] = await Promise.allSettled([
      api.get('/dashboard/summary'), api.get('/tracking'), api.get('/risk/history'),
    ]);
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value.data);
    else setLoadError('Fleet summary is unavailable. Confirm the backend is running and your session is valid.');
    if (trackingResult.status === 'fulfilled') setTrackingData(trackingResult.value.data);
    if (riskResult.status === 'fulfilled') setRiskHistory(riskResult.value.data);
    setLoading(false);
  };

  const activity = useMemo(() => {
    const risks = riskHistory.map((item) => ({
      id: `risk-${item.id}`, type: 'risk', title: `${item.risk_level} risk review saved`,
      detail: `Driver #${item.driver_id} · Vehicle #${item.vehicle_id}`, timestamp: item.prediction_timestamp,
      level: item.risk_level,
    }));
    const gps = trackingData.filter((item) => item.latest_gps).map((item) => ({
      id: `gps-${item.vehicle.id}`, type: 'gps', title: `${item.vehicle.vehicle_id} location recorded`,
      detail: `${Number(item.latest_gps.speed || 0).toFixed(0)} km/h · ${item.vehicle.status || 'Unknown status'}`,
      timestamp: item.latest_gps.timestamp,
    }));
    return [...risks, ...gps].filter((item) => item.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
  }, [riskHistory, trackingData]);

  const handleImport = async (event) => {
    event.preventDefault();
    if (!selectedFile) { setNotice('Select a CSV file to import.'); return; }
    setImporting(true); setNotice('');
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('data_type', dataType);
    try {
      const response = await api.post('/import/csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNotice(response.data.message || 'Import completed.');
      setImportModalOpen(false); setSelectedFile(null);
      await fetchDashboard();
    } catch (error) {
      setNotice(error.response?.data?.error || 'CSV import failed. Check that the file columns match the selected data type.');
    } finally { setImporting(false); }
  };

  const number = (value, decimals = 0) =>
    Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div className="dashboard-page">
      {/* Header */}
      <section className="dashboard-welcome">
        <div>
          <div className="dashboard-eyebrow"><span /> OPERATIONS OVERVIEW</div>
          <h1>Fleet at a glance<span>.</span></h1>
          <p>Your operation summary, recent vehicle activity and fleet actions in one view.</p>
        </div>
        <div className="dashboard-actions">
          <button
            className="dashboard-button subtle"
            onClick={fetchDashboard}
            disabled={loading}
          >
            <MdRefresh size={18} className={loading ? 'spin-icon' : ''} />
            Refresh data
          </button>
          <button
            className="dashboard-button primary"
            onClick={() => { setNotice(''); setImportModalOpen(true); }}
          >
            <MdUpload size={18} />
            Import fleet data
          </button>
        </div>
      </section>

      {loadError && (
        <div className="dashboard-notice error" role="alert">
          {loadError}
          <button onClick={fetchDashboard}>Retry</button>
        </div>
      )}
      {notice && (
        <div className="dashboard-notice" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
            <MdClose size={16} />
          </button>
        </div>
      )}

      {/* Metric cards */}
      <section className="metric-grid" aria-label="Fleet performance metrics">
        {metricCards.map((metric, index) => (
          <article
            className={`metric-card ${metric.tone}`}
            key={metric.key}
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <div className="metric-card-heading">
              <span>{metric.label}</span>
              <span className="metric-icon-badge">
                <metric.Icon size={16} />
              </span>
            </div>
            <div className="metric-value">
              {loading
                ? <span className="metric-skeleton" />
                : `${number(summary?.[metric.key], metric.decimals || 0)}${metric.suffix}`}
            </div>
            <div className="metric-card-foot">
              <span className="metric-dot" /> Based on fleet records
            </div>
          </article>
        ))}
      </section>

      {/* Panels */}
      <section className="dashboard-panels">
        {/* Activity panel */}
        <article className="dashboard-panel activity-panel">
          <div className="panel-title-row">
            <div>
              <span className="panel-overline">LATEST RECORDS</span>
              <h2>Recent fleet activity</h2>
            </div>
            <span className="panel-live"><i /> From your database</span>
          </div>
          {activity.length ? (
            <div className="activity-list">
              {activity.map((item) => (
                <div className="activity-row" key={item.id}>
                  <span className={`activity-icon ${item.type} ${item.level?.toLowerCase() || ''}`}>
                    {item.type === 'risk' ? <MdWarning size={15} /> : <MdLocationOn size={15} />}
                  </span>
                  <span className="activity-copy">
                    <b>{item.title}</b>
                    <small>{item.detail}</small>
                  </span>
                  <time>{timeLabel(item.timestamp)}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-activity">
              <MdAnalytics size={28} />
              <b>No recent activity yet</b>
              <p>Imported GPS records and risk reviews will appear here.</p>
            </div>
          )}
          <Link className="panel-footer-link" to="/tracking">Open vehicle tracking <span>→</span></Link>
        </article>

        {/* Fleet panel */}
        <article className="dashboard-panel fleet-panel">
          <div className="panel-title-row">
            <div>
              <span className="panel-overline">FLEET SNAPSHOT</span>
              <h2>Vehicles</h2>
            </div>
            <Link className="panel-text-link" to="/vehicles">View all <span>↗</span></Link>
          </div>
          {trackingData.length ? (
            <div className="fleet-list">
              {trackingData.slice(0, 4).map(({ vehicle, latest_gps }) => (
                <div className="fleet-row" key={vehicle.id}>
                  <span className="fleet-vehicle-icon">
                    <MdDirectionsCar size={14} />
                  </span>
                  <span className="fleet-vehicle-copy">
                    <b>{vehicle.vehicle_id}</b>
                    <small>{vehicle.registration_number || 'Registration not set'}</small>
                  </span>
                  <span className="fleet-speed">
                    {Number(latest_gps?.speed || vehicle.current_speed || 0).toFixed(0)} <small>km/h</small>
                  </span>
                  <span className={`fleet-status ${String(vehicle.status || 'offline').toLowerCase()}`}>
                    <i />{vehicle.status || 'OFFLINE'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-activity">
              <MdDirectionsCar size={28} />
              <b>No vehicles in this fleet</b>
              <p>Import a vehicle CSV to start managing your fleet.</p>
            </div>
          )}
          <Link className="panel-footer-link" to="/vehicles">Manage vehicles <span>→</span></Link>
        </article>
      </section>

      {/* Quick actions */}
      <section className="quick-action-section">
        <div>
          <span className="panel-overline">MOVE FROM OVERVIEW TO ACTION</span>
          <h2>What would you like to review?</h2>
        </div>
        <div className="quick-action-grid">
          <Link to="/tracking">
            <span><MdLocationOn size={18} /></span>
            <b>Track vehicles</b>
            <small>Latest GPS activity</small>
            <i>↗</i>
          </Link>
          <Link to="/risk-prediction">
            <span><MdWarning size={18} /></span>
            <b>Review risk</b>
            <small>Driver safety signals</small>
            <i>↗</i>
          </Link>
          <Link to="/fuel-analytics">
            <span><MdLocalGasStation size={18} /></span>
            <b>Analyze fuel</b>
            <small>Efficiency and use</small>
            <i>↗</i>
          </Link>
          <Link to="/driver-behavior">
            <span><MdSpeed size={18} /></span>
            <b>Driver behavior</b>
            <small>Behavior analytics</small>
            <i>↗</i>
          </Link>
        </div>
      </section>

      {/* Import modal */}
      {importModalOpen && (
        <div
          className="modal modal-open"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !importing) setImportModalOpen(false);
          }}
        >
          <div className="modal-box import-modal">
            <div className="import-modal-heading">
              <span className="import-modal-icon"><MdUpload size={20} /></span>
              <button
                type="button"
                aria-label="Close import dialog"
                disabled={importing}
                onClick={() => setImportModalOpen(false)}
              >
                <MdClose size={22} />
              </button>
              <span className="panel-overline">DATA MANAGEMENT</span>
              <h3>Import fleet data</h3>
              <p>Load a CSV file into the SQLite fleet database.</p>
            </div>
            <form onSubmit={handleImport}>
              <label className="import-label">
                Data type
                <select value={dataType} onChange={(event) => setDataType(event.target.value)}>
                  <option value="vehicles">Vehicles</option>
                  <option value="drivers">Drivers</option>
                  <option value="gps">GPS records</option>
                  <option value="journeys">Journeys</option>
                  <option value="fuel">Fuel records</option>
                </select>
              </label>
              <label className="import-label">
                CSV file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
              </label>
              <div className="import-hint">
                <span>i</span>
                <p>Use a CSV with column names matching the selected record type. GPS, journey and fuel imports need matching vehicle IDs already in the database.</p>
              </div>
              <div className="import-form-actions">
                <button
                  className="dashboard-button subtle"
                  type="button"
                  disabled={importing}
                  onClick={() => setImportModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="dashboard-button primary"
                  type="submit"
                  disabled={importing || !selectedFile}
                >
                  {importing ? 'Importing…' : 'Import CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
