import { useState, useEffect } from 'react';
import api from '../services/api';
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

  const riskDistribution = [
    { name: 'Low Risk', value: predictions.filter(p => p.risk_level === 'LOW').length, color: '#22C55E' },
    { name: 'Medium Risk', value: predictions.filter(p => p.risk_level === 'MEDIUM').length, color: '#F59E0B' },
    { name: 'High Risk', value: predictions.filter(p => p.risk_level === 'HIGH').length, color: '#EF4444' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-electric-blue"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Driver Safety Risk Analysis</h1>
        <p className="text-muted">Behavior-based risk signals that help supervisors intervene before unsafe journeys escalate.</p>
      </div>

      <div className="glass-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Model status</p>
          <p className="mt-1 font-semibold text-white">{modelInfo?.available ? 'Trained behavior anomaly classifier' : 'Rule-based behavior check active'}</p>
          <p className="mt-1 text-sm text-muted">{modelInfo?.source ? `${modelInfo.rows_used?.toLocaleString()} labeled events · ${modelInfo.source}` : 'No training metadata is available.'}</p>
          <p className="mt-2 text-xs text-warning">This is a preventive decision-support signal, not a confirmed accident prediction.</p>
        </div>
        {modelInfo?.accuracy != null && <div className="rounded-xl border border-white/10 px-4 py-3 text-right">
          <p className="text-xs text-muted">Holdout accuracy</p>
          <p className="text-xl font-bold text-cyan">{(modelInfo.accuracy * 100).toFixed(1)}%</p>
        </div>}
      </div>
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
              onChange={(e) => setSelectedDriver(parseInt(e.target.value))}
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
              onChange={(e) => setSelectedVehicle(parseInt(e.target.value))}
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
          <h3 className="text-xl font-semibold text-white mb-4">Risk Distribution</h3>
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
