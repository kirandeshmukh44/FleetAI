import { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const RiskPrediction = () => {
  const [predictions, setPredictions] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [predRes, driversRes, vehiclesRes, modelRes] = await Promise.all([
        api.get('/risk/history'),
        api.get('/drivers'),
        api.get('/vehicles'),
        api.get('/risk/model-info')
      ]);
      setPredictions(predRes.data);
      setDrivers(driversRes.data);
      setVehicles(vehiclesRes.data);
      setModelInfo(modelRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.response?.data?.error || 'Risk analysis data is unavailable right now. Check the API connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    if (!selectedDriver || !selectedVehicle) {
      setNotice('Choose a driver and vehicle to run a prediction.');
      return;
    }

    setPredicting(true);
    try {
      const response = await api.post('/risk/predict', {
        driver_id: selectedDriver,
        vehicle_id: selectedVehicle
      });
      setPredictions([response.data, ...predictions]);
      setNotice(`Prediction complete: ${response.data.risk_level} risk (${(response.data.risk_probability * 100).toFixed(1)}% anomaly probability).`);
    } catch (error) {
      console.error('Error predicting risk:', error);
      setNotice(error.response?.data?.error || 'Prediction failed. Check that the selected driver and vehicle are available.');
    } finally {
      setPredicting(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'LOW': return '#22C55E';
      case 'MEDIUM': return '#F59E0B';
      case 'HIGH': return '#EF4444';
      default: return '#94A3B8';
    }
  };

  const riskDistribution = predictions.length
    ? [
      { name: 'Low Risk', value: predictions.filter((p) => p.risk_level === 'LOW').length, color: '#22C55E' },
      { name: 'Medium Risk', value: predictions.filter((p) => p.risk_level === 'MEDIUM').length, color: '#F59E0B' },
      { name: 'High Risk', value: predictions.filter((p) => p.risk_level === 'HIGH').length, color: '#EF4444' },
    ]
    : [
      { name: 'Normal training events', value: modelInfo?.class_counts?.LOW || 0, color: '#22C55E' },
      { name: 'Anomalous training events', value: modelInfo?.class_counts?.HIGH || 0, color: '#EF4444' },
    ];

  if (loading) {
    return (
      <div className="page-loading" role="status" aria-live="polite">
        <span className="loading loading-spinner loading-lg text-electric-blue"></span>
        <span>Loading risk intelligence...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Driver Safety Risk Analysis</h1>
        <p className="text-muted">Behavior-based risk signals that help supervisors intervene before unsafe journeys escalate.</p>
      </div>
      {error && (
        <div className="data-alert" role="alert">
          <strong>Could not load risk analysis.</strong>
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={() => { setError(''); setLoading(true); fetchData(); }}>
            Retry
          </button>
        </div>
      )}

      <div className="glass-card flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-[260px] flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Model and data status</p>
          <p className="mt-1 font-semibold text-white">{modelInfo?.available ? `${modelInfo.model_name || 'Behavior anomaly model'} ? ${modelInfo.signal_quality === 'weak' ? 'weak holdout signal' : 'experimental'}` : 'Rule-based behavior check active'}</p>
          <p className="mt-1 text-sm text-muted">{modelInfo?.source ? `${modelInfo.rows_used?.toLocaleString()} labeled events ? ${modelInfo.driver_count} drivers ? ${modelInfo.vehicle_count} vehicles ? ${modelInfo.source}` : 'No training metadata is available.'}</p>
          {modelInfo?.period_start && <p className="mt-1 text-xs text-muted">Data period: {new Date(modelInfo.period_start).toLocaleString()} ? {new Date(modelInfo.period_end).toLocaleString()} ? Holdout: {modelInfo.holdout_method}</p>}
          <p className="mt-2 text-xs text-warning">Experimental decision support only. The bundled dataset has limited coverage and the holdout score is close to its class baseline. This is not a crash prediction.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-right">
          <div className="rounded-xl border border-white/10 px-4 py-3"><p className="text-xs text-muted">Balanced accuracy</p><p className="text-lg font-bold text-cyan">{modelInfo?.metrics?.balanced_accuracy != null ? `${(modelInfo.metrics.balanced_accuracy * 100).toFixed(1)}%` : '?'}</p></div>
          <div className="rounded-xl border border-white/10 px-4 py-3"><p className="text-xs text-muted">Anomaly recall</p><p className="text-lg font-bold text-warning">{modelInfo?.metrics?.high_recall != null ? `${(modelInfo.metrics.high_recall * 100).toFixed(1)}%` : '?'}</p></div>
          <div className="rounded-xl border border-white/10 px-4 py-3"><p className="text-xs text-muted">Anomaly PR-AUC</p><p className="text-lg font-bold text-white">{modelInfo?.metrics?.high_average_precision != null ? `${(modelInfo.metrics.high_average_precision * 100).toFixed(1)}%` : '?'}</p></div>
          <div className="rounded-xl border border-white/10 px-4 py-3"><p className="text-xs text-muted">Training anomaly rate</p><p className="text-lg font-bold text-white">{modelInfo?.anomaly_rate != null ? `${(modelInfo.anomaly_rate * 100).toFixed(1)}%` : '?'}</p></div>
        </div>
      </div>
      {modelInfo?.limitations?.length > 0 && <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100"><strong>Data limits:</strong> {modelInfo.limitations.join(' ')}</div>}
      {notice && <div className="rounded-xl border border-electric-blue/30 bg-electric-blue/10 px-4 py-3 text-sm text-white" role="status">{notice}</div>}

      {/* Prediction Form */}
      <div className="glass-card">
        <h3 className="text-xl font-semibold text-white mb-4">Review a driver and vehicle</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-white">Select Driver</span>
            </label>
            <select
              className="select select-bordered bg-navy-blue border-white/20 text-white"
              value={selectedDriver || ''}
              onChange={(e) => setSelectedDriver(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Choose driver...</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>{driver.name} ({driver.driver_id})</option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-white">Select Vehicle</span>
            </label>
            <select
              className="select select-bordered bg-navy-blue border-white/20 text-white"
              value={selectedVehicle || ''}
              onChange={(e) => setSelectedVehicle(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Choose vehicle...</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_id} ({vehicle.registration_number})</option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-white">&nbsp;</span>
            </label>
            <button
              onClick={handlePredict}
              disabled={predicting}
              className="btn btn-primary bg-electric-blue hover:bg-electric-blue/80 border-none"
            >
              {predicting ? <span className="loading loading-spinner"></span> : 'Predict Risk'}
            </button>
          </div>
        </div>
        {(!drivers.length || !vehicles.length) && <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-100">Add or import at least one driver and vehicle before running a fleet-specific analysis. <Link className="underline" to="/data-entry">Open Data Entry</Link>.</div>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card">
          <div className="text-3xl mb-2">📊</div>
          <h3 className="text-lg font-semibold text-white">Total Predictions</h3>
          <p className="text-2xl font-bold text-electric-blue">{predictions.length}</p>
        </div>
        <div className="glass-card">
          <div className="text-3xl mb-2">🟢</div>
          <h3 className="text-lg font-semibold text-white">Low Risk</h3>
          <p className="text-2xl font-bold text-success">
            {predictions.filter(p => p.risk_level === 'LOW').length}
          </p>
        </div>
        <div className="glass-card">
          <div className="text-3xl mb-2">🟡</div>
          <h3 className="text-lg font-semibold text-white">Medium Risk</h3>
          <p className="text-2xl font-bold text-warning">
            {predictions.filter(p => p.risk_level === 'MEDIUM').length}
          </p>
        </div>
        <div className="glass-card">
          <div className="text-3xl mb-2">🔴</div>
          <h3 className="text-lg font-semibold text-white">High Risk</h3>
          <p className="text-2xl font-bold text-danger">
            {predictions.filter(p => p.risk_level === 'HIGH').length}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <h3 className="text-xl font-semibold text-white mb-1">{predictions.length ? 'Saved Prediction Outcomes' : 'Training Dataset Labels'}</h3>
          <p className="mb-4 text-xs text-muted">{predictions.length ? 'Counts from predictions run in this workspace.' : 'Bundled labeled events; not live fleet predictions.'}</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1F33', border: '1px solid rgba(255,255,255,0.1)' }}
                itemStyle={{ color: '#F8FAFC' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Predictions</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {!predictions.length && <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-muted">No predictions have been saved for this fleet yet. Select a driver and vehicle above to score the latest available telemetry.</div>}
            {predictions.slice(0, 5).map((prediction) => (
              <div key={prediction.id} className="p-4 bg-white/5 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">
                    Driver ID: {prediction.driver_id} | Vehicle ID: {prediction.vehicle_id}
                  </span>
                  <span
                    className="badge"
                    style={{ backgroundColor: getRiskColor(prediction.risk_level), color: '#fff' }}
                  >
                    {prediction.risk_level}
                  </span>
                </div>
                <div className="text-sm text-muted">
                  <p>Risk Probability: {(prediction.risk_probability * 100).toFixed(1)}%</p>
                  <p>Model: {prediction.model_used}</p>
                  <p>Timestamp: {new Date(prediction.prediction_timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Predictions Table */}
      <div className="glass-card overflow-x-auto">
        <h3 className="text-xl font-semibold text-white mb-4">Prediction History</h3>
        <table className="table table-zebra">
          <thead>
            <tr className="text-white">
              <th>Timestamp</th>
              <th>Driver ID</th>
              <th>Vehicle ID</th>
              <th>Risk Probability</th>
              <th>Risk Level</th>
              <th>Model</th>
              <th>Contributing Factors</th>
            </tr>
          </thead>
          <tbody>
            {!predictions.length && <tr><td colSpan="7" className="py-8 text-center text-muted">No fleet prediction history yet. Training examples are summarized above; they are not inserted as customer predictions.</td></tr>}
            {predictions.map((prediction) => (
              <tr key={prediction.id} className="hover:bg-white/5">
                <td className="text-white">{new Date(prediction.prediction_timestamp).toLocaleString()}</td>
                <td className="text-white">{prediction.driver_id}</td>
                <td className="text-white">{prediction.vehicle_id}</td>
                <td className="text-white">{(prediction.risk_probability * 100).toFixed(1)}%</td>
                <td>
                  <span
                    className="badge"
                    style={{ backgroundColor: getRiskColor(prediction.risk_level), color: '#fff' }}
                  >
                    {prediction.risk_level}
                  </span>
                </td>
                <td className="text-white">{prediction.model_used}</td>
                <td className="text-white text-sm">{prediction.contributing_factors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskPrediction;
