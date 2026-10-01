import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const DriverBehavior = () => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'LOW': return '#22C55E';
      case 'MEDIUM': return '#F59E0B';
      case 'HIGH': return '#EF4444';
      default: return '#94A3B8';
    }
  };

  const getBehaviorScore = (driver) => {
    const harshBrakingScore = Math.min(driver.harsh_braking_count * 5, 100);
    const harshAccelScore = Math.min(driver.harsh_acceleration_count * 5, 100);
    const speedScore = Math.min(driver.average_speed * 2, 100);
    return {
      harshBraking: harshBrakingScore,
      harshAcceleration: harshAccelScore,
      speeding: speedScore,
      overall: driver.risk_score
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-electric-blue"></span>
      </div>
    );
  }

  const behaviorData = drivers.map(driver => ({
    name: driver.name.split(' ')[0],
    braking: driver.harsh_braking_count,
    acceleration: driver.harsh_acceleration_count,
    speed: driver.average_speed,
    risk: driver.risk_score
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Driver Behavior Analysis</h1>
        <p className="text-muted">AI-powered analysis of driving patterns and behavior</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card">
          <div className="text-3xl mb-2">👨‍✈️</div>
          <h3 className="text-lg font-semibold text-white">Total Drivers</h3>
          <p className="text-2xl font-bold text-electric-blue">{drivers.length}</p>
        </div>
        <div className="glass-card">
          <div className="text-3xl mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-white">High Risk</h3>
          <p className="text-2xl font-bold text-danger">
            {drivers.filter(d => d.risk_level === 'HIGH').length}
          </p>
        </div>
        <div className="glass-card">
          <div className="text-3xl mb-2">🚗</div>
          <h3 className="text-lg font-semibold text-white">Avg Harsh Braking</h3>
          <p className="text-2xl font-bold text-warning">
            {drivers.length > 0 ? (drivers.reduce((sum, d) => sum + d.harsh_braking_count, 0) / drivers.length).toFixed(1) : 0}
          </p>
        </div>
        <div className="glass-card">
          <div className="text-3xl mb-2">🚀</div>
          <h3 className="text-lg font-semibold text-white">Avg Harsh Accel</h3>
          <p className="text-2xl font-bold text-cyan">
            {drivers.length > 0 ? (drivers.reduce((sum, d) => sum + d.harsh_acceleration_count, 0) / drivers.length).toFixed(1) : 0}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <h3 className="text-xl font-semibold text-white mb-4">Harsh Events by Driver</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={behaviorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1F33', border: '1px solid rgba(255,255,255,0.1)' }}
                itemStyle={{ color: '#F8FAFC' }}
              />
              <Legend />
              <Bar dataKey="braking" fill="#EF4444" name="Harsh Braking" />
              <Bar dataKey="acceleration" fill="#F59E0B" name="Harsh Acceleration" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="text-xl font-semibold text-white mb-4">Risk Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={behaviorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1F33', border: '1px solid rgba(255,255,255,0.1)' }}
                itemStyle={{ color: '#F8FAFC' }}
              />
              <Legend />
              <Bar dataKey="risk" fill="#1677FF" name="Risk Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver List */}
      <div className="glass-card overflow-x-auto">
        <h3 className="text-xl font-semibold text-white mb-4">Driver Behavior Summary</h3>
        <table className="table table-zebra">
          <thead>
            <tr className="text-white">
              <th>Driver</th>
              <th>Total Journeys</th>
              <th>Avg Speed</th>
              <th>Harsh Braking</th>
              <th>Harsh Accel</th>
              <th>Risk Level</th>
              <th>Risk Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-white/5">
                <td className="font-medium text-white">{driver.name}</td>
                <td className="text-white">{driver.total_journeys}</td>
                <td className="text-white">{driver.average_speed} km/h</td>
                <td className="text-white">{driver.harsh_braking_count}</td>
                <td className="text-white">{driver.harsh_acceleration_count}</td>
                <td>
                  <span
                    className="badge"
                    style={{ backgroundColor: getRiskColor(driver.risk_level), color: '#fff' }}
                  >
                    {driver.risk_level}
                  </span>
                </td>
                <td className="text-white">{driver.risk_score}/100</td>
                <td>
                  <button
                    onClick={() => setSelectedDriver(driver)}
                    className="btn btn-sm btn-ghost text-electric-blue hover:bg-electric-blue/20"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDriver && (
        <div className="modal modal-open">
          <div className="modal-box bg-navy-blue border border-white/10 max-w-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              Driver Behavior - {selectedDriver.name}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass-card">
                <p className="text-muted text-sm">Total Journeys</p>
                <p className="text-2xl font-bold text-electric-blue">{selectedDriver.total_journeys}</p>
              </div>
              <div className="glass-card">
                <p className="text-muted text-sm">Average Speed</p>
                <p className="text-2xl font-bold text-cyan">{selectedDriver.average_speed} km/h</p>
              </div>
              <div className="glass-card">
                <p className="text-muted text-sm">Harsh Braking Events</p>
                <p className="text-2xl font-bold text-danger">{selectedDriver.harsh_braking_count}</p>
              </div>
              <div className="glass-card">
                <p className="text-muted text-sm">Harsh Acceleration</p>
                <p className="text-2xl font-bold text-warning">{selectedDriver.harsh_acceleration_count}</p>
              </div>
            </div>

            <div className="glass-card mb-4">
              <h4 className="text-lg font-semibold text-white mb-3">Behavior Analysis</h4>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={[
                  { metric: 'Braking', value: Math.min(selectedDriver.harsh_braking_count * 10, 100) },
                  { metric: 'Acceleration', value: Math.min(selectedDriver.harsh_acceleration_count * 10, 100) },
                  { metric: 'Speed', value: Math.min(selectedDriver.average_speed * 2, 100) },
                  { metric: 'Risk', value: selectedDriver.risk_score },
                  { metric: 'Efficiency', value: selectedDriver.fuel_efficiency * 10 }
                ]}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="metric" stroke="#94A3B8" />
                  <PolarRadiusAxis stroke="#94A3B8" />
                  <Radar
                    name="Behavior Score"
                    dataKey="value"
                    stroke="#1677FF"
                    fill="#1677FF"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-muted">Overall Risk Level:</span>
              <span
                className="badge badge-lg"
                style={{ backgroundColor: getRiskColor(selectedDriver.risk_level), color: '#fff' }}
              >
                {selectedDriver.risk_level}
              </span>
            </div>

            <div className="modal-action">
              <button
                onClick={() => setSelectedDriver(null)}
                className="btn bg-electric-blue hover:bg-electric-blue/80 border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverBehavior;
