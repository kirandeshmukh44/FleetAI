import { useEffect, useState } from 'react';
import api from '../services/api';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('fleet');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatedAt, setGeneratedAt] = useState(null);

  const reportTypes = [
    { id: 'fleet', name: 'Fleet Performance', icon: '🚛' },
    { id: 'driver', name: 'Driver Performance', icon: '👨‍✈️' },
    { id: 'fuel', name: 'Fuel Report', icon: '⛽' },
    { id: 'risk', name: 'Risk Analysis', icon: '⚠️' },
    { id: 'journey', name: 'Journey Report', icon: '📍' },
  ];

  useEffect(() => {
    Promise.allSettled([
      api.get('/dashboard/summary'),
      api.get('/fuel/analytics'),
      api.get('/risk/history'),
    ]).then((results) => {
      const [summary, fuel, risk] = results;
      if (results.every((result) => result.status === 'rejected')) {
        setError('Reports could not connect to the workspace data.');
      }
      setReportData({
        summary: summary.status === 'fulfilled' ? summary.value.data : {},
        fuel: fuel.status === 'fulfilled' ? fuel.value.data : { vehicle_consumption: [] },
        risk: risk.status === 'fulfilled' ? risk.value.data : [],
      });
    }).finally(() => setLoading(false));
  }, []);

  const activeReport = reportTypes.find((report) => report.id === selectedReport);
  const riskCounts = (reportData?.risk || []).reduce((counts, item) => {
    counts[item.risk_level] = (counts[item.risk_level] || 0) + 1;
    return counts;
  }, {});

  const generateReport = () => setGeneratedAt(new Date());

  const exportCsv = () => {
    const summary = reportData?.summary || {};
    const rows = [
      ['Report', activeReport?.name || 'Fleet report'],
      ['Generated', new Date().toISOString()],
      ['Vehicles', summary.total_vehicles ?? 0],
      ['Active vehicles', summary.active_vehicles ?? 0],
      ['Drivers', summary.total_drivers ?? 0],
      ['Journeys', summary.total_journeys ?? 0],
      ['Average fuel efficiency', summary.average_fuel_efficiency ?? 0],
      ['Risk alerts', summary.risk_alerts ?? 0],
    ];
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedReport}-report.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) {
    return <div className="page-loading" role="status" aria-live="polite"><span className="loading loading-spinner loading-lg text-electric-blue" /><span>Preparing reports...</span></div>;
  }

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Reports</h1>
        <p className="text-muted">Generate and view fleet performance reports</p>
      </div>

      {error && <div className="data-alert" role="alert"><strong>Report data is limited.</strong><span>{error}</span></div>}

      {/* Report Type Selection */}
      <div className="glass-card">
        <h3 className="text-xl font-semibold text-white mb-4">Select Report Type</h3>
          <div className="report-type-grid">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              className={`report-type-button ${
                selectedReport === type.id
                  ? 'bg-electric-blue/20 border-electric-blue text-electric-blue'
                  : 'bg-white/5 border-white/10 text-muted hover:bg-white/10'
              }`}
            >
              <div className="text-3xl mb-2">{type.icon}</div>
              <div className="font-medium">{type.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Report Filters */}
      <div className="glass-card">
        <h3 className="text-xl font-semibold text-white mb-4">Report Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-white">Start Date</span>
            </label>
            <input
              aria-label="Start date"
              type="date"
              className="input input-bordered bg-navy-blue border-white/20 text-white"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-white">End Date</span>
            </label>
            <input
              aria-label="End date"
              type="date"
              className="input input-bordered bg-navy-blue border-white/20 text-white"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-white">Vehicle</span>
            </label>
            <select aria-label="Vehicle" className="select select-bordered bg-navy-blue border-white/20 text-white">
              <option>All Vehicles</option>
              {(reportData?.fuel?.vehicle_consumption || []).map((vehicle) => <option key={vehicle.vehicle_id}>VH-{vehicle.vehicle_id}</option>)}
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-white">Driver</span>
            </label>
            <select aria-label="Driver" className="select select-bordered bg-navy-blue border-white/20 text-white">
              <option>All Drivers</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <button onClick={generateReport} className="btn btn-primary bg-electric-blue hover:bg-electric-blue/80 border-none">
            Generate Report
          </button>
          <button onClick={() => window.print()} className="btn btn-outline border-white/20 text-white hover:bg-white/10">
            Export PDF
          </button>
          <button onClick={exportCsv} className="btn btn-outline border-white/20 text-white hover:bg-white/10">
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div className="glass-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">
            {activeReport?.name} Report
          </h3>
          <button onClick={() => window.print()} className="btn btn-sm btn-ghost text-electric-blue hover:bg-electric-blue/20">
            Print Report
          </button>
        </div>
        
        <div className="report-preview">
          <div className="report-preview-header"><span>{generatedAt ? `Generated ${generatedAt.toLocaleString()}` : 'Live workspace snapshot'}</span><span className="report-status">{generatedAt ? 'READY' : 'PREVIEW'}</span></div>
          <div className="report-metric-grid">
            <div><span>Vehicles</span><strong>{reportData?.summary?.total_vehicles ?? 0}</strong></div>
            <div><span>Drivers</span><strong>{reportData?.summary?.total_drivers ?? 0}</strong></div>
            <div><span>Journeys</span><strong>{reportData?.summary?.total_journeys ?? 0}</strong></div>
            <div><span>Risk alerts</span><strong className="text-warning">{reportData?.summary?.risk_alerts ?? 0}</strong></div>
          </div>
          <p className="mt-6 text-sm text-muted">Risk history: {riskCounts.LOW || 0} low, {riskCounts.MEDIUM || 0} medium, {riskCounts.HIGH || 0} high. Average fuel efficiency: {reportData?.summary?.average_fuel_efficiency ?? 0} km/l.</p>
        </div>
      </div>

      {/* Report Templates */}
      <div className="glass-card">
        <h3 className="text-xl font-semibold text-white mb-4">Saved Report Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📋</span>
              <span className="font-medium text-white">Monthly Fleet Summary</span>
            </div>
            <p className="text-sm text-muted">Generated on: 2024-01-15</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">👨‍✈️</span>
              <span className="font-medium text-white">Driver Performance Q4</span>
            </div>
            <p className="text-sm text-muted">Generated on: 2024-01-10</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⛽</span>
              <span className="font-medium text-white">Fuel Analysis January</span>
            </div>
            <p className="text-sm text-muted">Generated on: 2024-01-05</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
