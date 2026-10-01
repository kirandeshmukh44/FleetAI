import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

// Fix for default marker icon in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Tracking = () => {
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    fetchTrackingData();
    const refreshTimer = window.setInterval(fetchTrackingData, 30000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const fetchTrackingData = async () => {
    try {
      const response = await api.get('/tracking');
      setTrackingData(response.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return '#22C55E';
      case 'IDLE': return '#F59E0B';
      case 'STOPPED': return '#EF4444';
      case 'OFFLINE': return '#94A3B8';
      default: return '#94A3B8';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-electric-blue"></span>
      </div>
    );
  }

  const center = trackingData.length > 0 && trackingData[0].latest_gps
    ? [trackingData[0].latest_gps.latitude, trackingData[0].latest_gps.longitude]
    : [19.0760, 72.8777]; // Default to Mumbai

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Fleet Tracking</h1>
        <p className="text-muted">Monitor the latest GPS position and verify whether each vehicle feed is current.</p>
      </div>

      <div className="glass-card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Operational feed</p>
          <p className="mt-1 text-sm text-white">Green markers are current feeds. Stale and historical records need verification before dispatch decisions.</p>
        </div>
        <span className="text-xs text-muted">Auto-refreshes every 30 seconds{lastRefresh ? ` · Updated ${lastRefresh.toLocaleTimeString()}` : ''}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 glass-card p-0 overflow-hidden">
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '600px', width: '100%' }}
            className="rounded-xl"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {trackingData.map((data) => {
              if (!data.latest_gps) return null;
              return (
                <Marker
                  key={data.vehicle.id}
                  position={[data.latest_gps.latitude, data.latest_gps.longitude]}
                  eventHandlers={{
                    click: () => setSelectedVehicle(data)
                  }}
                >
                  <Popup className="bg-navy-blue text-white">
                    <div className="text-white">
                      <strong>{data.vehicle.vehicle_id}</strong><br />
                      Status: {data.vehicle.status}<br />
                      Speed: {data.vehicle.current_speed} km/h<br />
                      Driver: {data.vehicle.current_driver_id || 'N/A'}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Vehicle List */}
        <div className="glass-card max-h-[600px] overflow-y-auto">
          <h3 className="text-xl font-semibold text-white mb-4">Fleet feed status</h3>
          <div className="space-y-3">
            {trackingData.map((data) => (
              <div
                key={data.vehicle.id}
                onClick={() => setSelectedVehicle(data)}
                className="p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">{data.vehicle.vehicle_id}</span>
                  <span className="flex items-center gap-2 text-xs" style={{ color: getStatusColor(data.vehicle.status) }}>
                    <i className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(data.vehicle.status) }} />
                    {data.feed_status || 'NO_DATA'}
                  </span>
                </div>
                <div className="text-sm text-muted space-y-1">
                  <p>Reg: {data.vehicle.registration_number}</p>
                  <p>Status: {data.vehicle.status}</p>
                  <p>GPS feed: {data.feed_status || 'NO_DATA'}</p>
                  <p>Speed: {data.vehicle.current_speed} km/h</p>
                  <p>Fuel: {data.vehicle.fuel_level}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedVehicle && (
        <div className="modal modal-open">
          <div className="modal-box bg-navy-blue border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">
              Vehicle Details - {selectedVehicle.vehicle.vehicle_id}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted">Registration:</span>
                <span className="text-white">{selectedVehicle.vehicle.registration_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Type:</span>
                <span className="text-white">{selectedVehicle.vehicle.vehicle_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Status:</span>
                <span className="text-white">{selectedVehicle.vehicle.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Current Speed:</span>
                <span className="text-white">{selectedVehicle.vehicle.current_speed} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Fuel Level:</span>
                <span className="text-white">{selectedVehicle.vehicle.fuel_level}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Risk Level:</span>
                <span className="text-white">{selectedVehicle.vehicle.risk_level}</span>
              </div>
              {selectedVehicle.latest_gps && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted">Last Location:</span>
                    <span className="text-white">
                      {selectedVehicle.latest_gps.latitude.toFixed(4)}, {selectedVehicle.latest_gps.longitude.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Last Update:</span>
                    <span className="text-white">
                      {new Date(selectedVehicle.latest_gps.timestamp).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
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

export default Tracking;
