import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'text-success';
      case 'IDLE': return 'text-warning';
      case 'STOPPED': return 'text-danger';
      case 'OFFLINE': return 'text-muted';
      default: return 'text-muted';
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
          <h1 className="text-3xl font-bold text-white mb-2">Vehicle Management</h1>
          <p className="text-muted">Manage and monitor your fleet vehicles</p>
        </div>
        <Link to="/data-entry" className="btn btn-primary bg-electric-blue hover:bg-electric-blue/80 border-none">
          Add / Manage in Data Entry
        </Link>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr className="text-white">
              <th>Vehicle ID</th>
              <th>Registration</th>
              <th>Type</th>
              <th>Make/Model</th>
              <th>Status</th>
              <th>Speed</th>
              <th>Fuel Level</th>
              <th>Risk Level</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-white/5">
                <td className="font-medium text-white">{vehicle.vehicle_id}</td>
                <td className="text-white">{vehicle.registration_number}</td>
                <td className="text-white">{vehicle.vehicle_type}</td>
                <td className="text-white">{vehicle.make} {vehicle.model}</td>
                <td>
                  <span className={`badge ${getStatusColor(vehicle.status)}`}>
                    {vehicle.status}
                  </span>
                </td>
                <td className="text-white">{vehicle.current_speed} km/h</td>
                <td className="text-white">{vehicle.fuel_level}%</td>
                <td>
                  <span className={`badge ${getRiskColor(vehicle.risk_level)}`}>
                    {vehicle.risk_level}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedVehicle(vehicle)}
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

      {selectedVehicle && (
        <div className="modal modal-open">
          <div className="modal-box bg-navy-blue border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">
              Vehicle Details - {selectedVehicle.vehicle_id}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted">Registration:</span>
                <span className="text-white">{selectedVehicle.registration_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Type:</span>
                <span className="text-white">{selectedVehicle.vehicle_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Make/Model:</span>
                <span className="text-white">{selectedVehicle.make} {selectedVehicle.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Year:</span>
                <span className="text-white">{selectedVehicle.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Fuel Type:</span>
                <span className="text-white">{selectedVehicle.fuel_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Status:</span>
                <span className={`badge ${getStatusColor(selectedVehicle.status)}`}>
                  {selectedVehicle.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Current Speed:</span>
                <span className="text-white">{selectedVehicle.current_speed} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Fuel Level:</span>
                <span className="text-white">{selectedVehicle.fuel_level}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Risk Level:</span>
                <span className={`badge ${getRiskColor(selectedVehicle.risk_level)}`}>
                  {selectedVehicle.risk_level}
                </span>
              </div>
            </div>
            <div className="modal-action">
              <button
                onClick={() => setSelectedVehicle(null)}
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

export default Vehicles;
