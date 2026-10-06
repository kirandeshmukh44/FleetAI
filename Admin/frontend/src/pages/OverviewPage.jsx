import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  MdPeople,
  MdDirectionsCar,
  MdBadge,
  MdWarning,
  MdRoute,
  MdLocalGasStation,
  MdSpeed,
  MdTrendingUp,
} from 'react-icons/md';

import PageHeader from '../components/PageHeader';
import StatTile from '../components/StatTile';
import Alert from '../components/Alert';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import api, { errorMessage } from '../services/api';
import { formatNumber, formatDecimal, formatCurrency } from '../utils/format';

const VEHICLE_COLORS = { ACTIVE: '#22c55e', IDLE: '#f59e0b', STOPPED: '#ef4444', OFFLINE: '#94a3b8' };
const RISK_COLORS = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444' };

const tooltipStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-strong)',
  borderRadius: 10,
  fontSize: 12,
};

const OverviewPage = () => {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [topVehicles, setTopVehicles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, trendsRes, topRes, notesRes] = await Promise.all([
        api.get('/overview/stats'),
        api.get('/overview/trends'),
        api.get('/overview/top-vehicles'),
        api.get('/system/notifications?resolved=false'),
      ]);
      setStats(statsRes.data);
      setTrends(trendsRes.data.trends || []);
      setTopVehicles(topRes.data || []);
      setNotifications(notesRes.data || []);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load platform overview.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = stats?.kpis || {};
  const recent = stats?.recent_7_days || {};

  const statusData = Object.entries(stats?.vehicle_status || {})
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  const riskData = Object.entries(stats?.driver_risk || {})
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  const trendData = trends.map((entry) => ({
    date: entry.date?.slice(5) || '',
    Journeys: entry.journeys || 0,
    Vehicles: entry.vehicles || 0,
    Drivers: entry.drivers || 0,
  }));

  const columns = [
    {
      key: 'code',
      header: 'Vehicle',
      render: (row) => (
        <>
          <div className="cell-primary mono">{row.code}</div>
          <div className="cell-sub">{row.registration_number}</div>
        </>
      ),
    },
    { key: 'vehicle_type', header: 'Type', render: (row) => row.vehicle_type || '—' },
    { key: 'owner', header: 'Owner', render: (row) => row.owner },
    { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> },
    {
      key: 'distance_km',
      header: 'Distance',
      className: 'text-right',
      render: (row) => `${formatDecimal(row.distance_km, 1)} km`,
    },
    {
      key: 'efficiency',
      header: 'Efficiency',
      className: 'text-right',
      render: (row) => `${formatDecimal(row.efficiency, 2)} km/l`,
    },
  ];


  return (
    <>
      <PageHeader
        title="Platform Overview"
        description="Live, cross-tenant statistics for every user, vehicle and journey in the FleetAI platform."
        actions={
          <button type="button" className="btn" onClick={load} disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            Refresh
          </button>
        }
      />

      {error ? <Alert tone="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="admin-grid cols-4">
        {loading && !stats ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 116, borderRadius: 14 }} />
          ))
        ) : (
          <>
            <StatTile label="Platform Users" value={formatNumber(kpis.total_users)} icon={MdPeople} tone="#00c2ff"
              hint={`${formatNumber(recent.new_users)} new this week`} />
            <StatTile label="Vehicles" value={formatNumber(kpis.total_vehicles)} icon={MdDirectionsCar} tone="#1677ff"
              hint={`${formatNumber(kpis.active_vehicles)} active · ${formatDecimal(kpis.fleet_utilization, 1)}% utilised`} />
            <StatTile label="Drivers" value={formatNumber(kpis.total_drivers)} icon={MdBadge} tone="#00d4a8"
              hint={`${formatNumber(recent.new_drivers)} onboarded this week`} />
            <StatTile label="Journeys" value={formatNumber(kpis.total_journeys)} icon={MdRoute} tone="#a855f7"
              hint={`${formatNumber(recent.new_journeys)} recorded this week`} />
            <StatTile label="High Risk Drivers" value={formatNumber(kpis.high_risk_drivers)} icon={MdWarning} tone="#ef4444"
              hint={`${formatNumber(kpis.high_risk_predictions)} high-risk predictions`} />
            <StatTile label="Avg Fuel Efficiency" value={formatDecimal(kpis.avg_fuel_efficiency, 2)} icon={MdLocalGasStation} tone="#22c55e"
              hint="km per litre" />
            <StatTile label="Distance Covered" value={formatDecimal(kpis.total_distance_km, 0)} icon={MdSpeed} tone="#f59e0b"
              hint="kilometres, all tenants" />
            <StatTile label="Fuel Spend" value={formatCurrency(kpis.total_fuel_cost)} icon={MdTrendingUp} tone="#00c2ff"
              hint="total recorded cost" />
          </>
        )}
      </section>

      {notifications.length > 0 ? (
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Open Operator Alerts</h2>
              <p>Unresolved system notifications</p>
            </div>
            <Badge value={`${notifications.length} open`} tone="warning" />
          </div>
          <ul className="list-reset flex flex-col gap-2">
            {notifications.map((note) => (
              <li
                key={note.id}
                className={`alert alert-${note.severity === 'critical' ? 'error' : 'info'}`}
                style={{ marginBottom: 0 }}
              >
                <span>
                  <strong>{note.title}</strong> — {note.message}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}


      <section className="admin-grid cols-2">
        <div className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>30-Day Activity</h2>
              <p>Records created per day</p>
            </div>
          </div>
          {trendData.length === 0 ? (
            <div className="empty-state">No activity recorded in the last 30 days.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Journeys" fill="#1677ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Vehicles" fill="#00c2ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Drivers" fill="#00d4a8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Fleet Composition</h2>
              <p>Vehicle status and driver risk split</p>
            </div>
          </div>
          <div className="admin-grid cols-2">
            <div>
              <h3 className="text-sm muted" style={{ margin: '0 0 8px' }}>Vehicle status</h3>
              {statusData.length === 0 ? (
                <div className="muted text-sm">No vehicles registered.</div>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={VEHICLE_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div>
              <h3 className="text-sm muted" style={{ margin: '0 0 8px' }}>Driver risk</h3>
              {riskData.length === 0 ? (
                <div className="muted text-sm">No drivers registered.</div>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      {riskData.map((entry) => (
                        <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Highest Mileage Vehicles</h2>
            <p>Top performers by recorded journey distance</p>
          </div>
        </div>
        <DataTable columns={columns} rows={topVehicles} loading={loading} emptyMessage="No journey data recorded yet." />
      </section>
    </>
  );
};

export default OverviewPage;
