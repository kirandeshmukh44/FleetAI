import { useEffect, useState, useCallback } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { MdWarning, MdSpeed, MdLocalGasStation, MdTrendingUp } from 'react-icons/md';

import PageHeader from '../components/PageHeader';
import StatTile from '../components/StatTile';
import Alert from '../components/Alert';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import api, { errorMessage } from '../services/api';
import { formatDecimal, formatNumber } from '../utils/format';

const RiskPage = () => {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/overview/risk-breakdown');
      setBreakdown(data);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load risk intelligence.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byLevel = breakdown?.by_level || {};
  const byModel = breakdown?.by_model || [];
  const events = breakdown?.behavior_events || {};

  const levelData = Object.entries(byLevel)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
  const totalPredictions = levelData.reduce((sum, item) => sum + item.value, 0);

  const modelData = byModel.map((entry) => ({
    name: entry.model_used.length > 22 ? `${entry.model_used.slice(0, 22)}…` : entry.model_used,
    count: entry.count,
  }));

  const columns = [
    { key: 'name', header: 'Risk level', render: (row) => <Badge value={row.name} /> },
    { key: 'value', header: 'Predictions', className: 'text-right', render: (row) => formatNumber(row.value) },
    {
      key: 'share',
      header: 'Share',
      className: 'text-right',
      render: (row) => (totalPredictions ? `${formatDecimal((row.value / totalPredictions) * 100, 1)}%` : '—'),
    },
  ];


  return (
    <>
      <PageHeader
        title="Risk Intelligence"
        description="Aggregated machine-learning risk predictions and raw driver-behaviour event counts across the whole platform."
        actions={
          <button type="button" className="btn" onClick={load} disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            Refresh
          </button>
        }
      />

      {error ? <Alert tone="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="admin-grid cols-4">
        {loading && !breakdown ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 116, borderRadius: 14 }} />
          ))
        ) : (
          <>
            <StatTile label="High Risk" value={formatNumber(byLevel.HIGH)} icon={MdWarning} tone="#ef4444" hint="predictions" />
            <StatTile label="Medium Risk" value={formatNumber(byLevel.MEDIUM)} icon={MdWarning} tone="#f59e0b" hint="predictions" />
            <StatTile label="Low Risk" value={formatNumber(byLevel.LOW)} icon={MdWarning} tone="#22c55e" hint="predictions" />
            <StatTile label="Total Predictions" value={formatNumber(totalPredictions)} icon={MdTrendingUp} tone="#00c2ff" hint="across all drivers" />
          </>
        )}
      </section>

      <section className="admin-grid cols-3">
        <StatTile label="Harsh Braking Events" value={formatNumber(events.harsh_braking)} icon={MdSpeed} tone="#ef4444" hint="recorded telemetry" />
        <StatTile label="Harsh Acceleration" value={formatNumber(events.harsh_acceleration)} icon={MdSpeed} tone="#f59e0b" hint="recorded telemetry" />
        <StatTile label="Speeding Violations" value={formatNumber(events.speeding)} icon={MdLocalGasStation} tone="#00c2ff" hint="recorded telemetry" />
      </section>

      <section className="admin-grid cols-2">
        <div className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Predictions by Risk Level</h2>
              <p>Distribution of recorded ML risk assessments</p>
            </div>
          </div>
          <DataTable columns={columns} rows={levelData} loading={loading} emptyMessage="No risk predictions recorded yet." />
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Predictions by Model</h2>
              <p>Which model produced each assessment</p>
            </div>
          </div>
          {modelData.length === 0 ? (
            <div className="empty-state">No model predictions recorded.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={modelData} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} stroke="currentColor" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {modelData.map((entry) => (
                    <Cell key={entry.name} fill="#1677ff" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </>
  );
};

export default RiskPage;
