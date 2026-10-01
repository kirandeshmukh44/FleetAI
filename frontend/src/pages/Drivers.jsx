import { useState, useEffect } from 'react';
import api from '../services/api';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);

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
      case 'LOW': return 'text-success';
      case 'MEDIUM': return 'text-warning';
      case 'HIGH': return 'text-danger';
      default: return 'text-muted';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-electric-blue"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Driver Management</h1>
          <p className="text-muted">Manage and monitor your drivers</p>
        </div>
        <button className="btn btn-primary bg-electric-blue hover:bg-electric-blue/80 border-none">
          Add Driver
        </button>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr className="text-white">
              <th>Driver ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>License</th>
              <th>Total Journeys</th>
              <th>Avg Speed</th>
              <th>Risk Level</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-white/5">
                <td className="font-medium text-white">{driver.driver_id}</td>
                <td className="text-white">{driver.name}</td>
                <td className="text-white">{driver.email}</td>
                <td className="text-white">{driver.phone}</td>
                <td className="text-white">{driver.license_number}</td>
                <td className="text-white">{driver.total_journeys}</td>
                <td className="text-white">{driver.average_speed} km/h</td>
                <td>
                  <span className={`badge ${getRiskColor(driver.risk_level)}`}>
                    {driver.risk_level}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedDriver(driver)}
                      className="btn btn-sm btn-ghost text-electric-blue hover:bg-electric-blue/20"
                    >
                      View
                    </button>
                    <button className="btn btn-sm btn-ghost text-cyan hover:bg-cyan/20">
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDriver && (
        <div className="modal modal-open">
          <div className="modal-box bg-navy-blue border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">
              Driver Details - {selectedDriver.name}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted">Driver ID:</span>
                <span className="text-white">{selectedDriver.driver_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Email:</span>
                <span className="text-white">{selectedDriver.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Phone:</span>
                <span className="text-white">{selectedDriver.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">License Number:</span>
                <span className="text-white">{selectedDriver.license_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">License Expiry:</span>
                <span className="text-white">{selectedDriver.license_expiry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total Journeys:</span>
                <span className="text-white">{selectedDriver.total_journeys}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Average Speed:</span>
                <span className="text-white">{selectedDriver.average_speed} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Harsh Braking:</span>
                <span className="text-white">{selectedDriver.harsh_braking_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Harsh Acceleration:</span>
                <span className="text-white">{selectedDriver.harsh_acceleration_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Risk Level:</span>
                <span className={`badge ${getRiskColor(selectedDriver.risk_level)}`}>
                  {selectedDriver.risk_level}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Risk Score:</span>
                <span className="text-white">{selectedDriver.risk_score}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Fuel Efficiency:</span>
                <span className="text-white">{selectedDriver.fuel_efficiency} km/l</span>
              </div>
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

export default Drivers;
