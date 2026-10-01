import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const FuelAnalytics = () => {
  const [fuelRecords, setFuelRecords] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recordsRes, analyticsRes] = await Promise.all([
        api.get('/fuel'),
        api.get('/fuel/analytics')
      ]);
      setFuelRecords(recordsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching fuel data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-electric-blue"></span>
      </div>
    );
  }

  const chartData = analytics?.vehicle_consumption?.map(vc => ({
    vehicle: `VH-${vc.vehicle_id}`,
    consumption: vc.total_consumed,
    efficiency: vc.avg_efficiency
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Fuel Analytics</h1>
        <p className="text-muted">Fuel consumption analysis and efficiency metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card">
          <div className="text-3xl mb-2">⛽</div>
          <h3 className="text-lg font-semibold text-white">Total Consumption</h3>
          <p className="text-2xl font-bold text-teal">
            {analytics?.vehicle_consumption?.reduce((sum, vc) => sum + vc.total_consumed, 0).toFixed(1) || 0} L
          </p>
        </div>
        <div className="glass-card">
          <div className="text-3xl mb-2">📊</div>
          <h3 className="text-lg font-semibold text-white">Avg Efficiency</h3>
          <p className="text-2xl font-bold text-electric-blue">
            {analytics?.vehicle_consumption?.length > 0
              ? (analytics.vehicle_consumption.reduce((sum, vc) => sum + vc.avg_efficiency, 0) / analytics.vehicle_consumption.length).toFixed(2)
              : 0} km/l
          </p>
        </div>
        <div className="glass-card">
          <div className="text-3xl mb-2">🚛</div>
          <h3 className="text-lg font-semibold text-white">Active Vehicles</h3>
          <p className="text-2xl font-bold text-cyan">
            {analytics?.vehicle_consumption?.length || 0}
          </p>
        </div>
        <div className="glass-card">
          <div className="text-3xl mb-2">💰</div>
          <h3 className="text-lg font-semibold text-white">Est. Cost</h3>
          <p className="text-2xl font-bold text-warning">
            ₹{(analytics?.vehicle_consumption?.reduce((sum, vc) => sum + vc.total_consumed, 0) * 100).toFixed(0) || 0}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <h3 className="text-xl font-semibold text-white mb-4">Fuel Consumption by Vehicle</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="vehicle" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1F33', border: '1px solid rgba(255,255,255,0.1)' }}
                itemStyle={{ color: '#F8FAFC' }}
              />
              <Legend />
              <Bar dataKey="consumption" fill="#1677FF" name="Consumption (L)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="text-xl font-semibold text-white mb-4">Fuel Efficiency by Vehicle</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="vehicle" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1F33', border: '1px solid rgba(255,255,255,0.1)' }}
                itemStyle={{ color: '#F8FAFC' }}
              />
              <Legend />
              <Line type="monotone" dataKey="efficiency" stroke="#00D4A8" strokeWidth={2} name="Efficiency (km/l)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fuel Records Table */}
      <div className="glass-card overflow-x-auto">
        <h3 className="text-xl font-semibold text-white mb-4">Recent Fuel Records</h3>
        <table className="table table-zebra">
          <thead>
            <tr className="text-white">
              <th>Timestamp</th>
              <th>Vehicle ID</th>
              <th>Fuel Level</th>
              <th>Consumed</th>
              <th>Distance</th>
              <th>Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {fuelRecords.slice(0, 10).map((record) => (
              <tr key={record.id} className="hover:bg-white/5">
                <td className="text-white">{new Date(record.timestamp).toLocaleString()}</td>
                <td className="text-white">VH-{record.vehicle_id}</td>
                <td className="text-white">{record.fuel_level}%</td>
                <td className="text-white">{record.fuel_consumed} L</td>
                <td className="text-white">{record.distance_traveled} km</td>
                <td className="text-white">{record.fuel_efficiency} km/l</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FuelAnalytics;
