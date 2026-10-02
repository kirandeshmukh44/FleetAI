import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import '../styles/tracking.css';
import {
  MdMyLocation,
  MdLocationOn,
  MdLocationOff,
  MdRefresh,
  MdDirectionsCar,
  MdSpeed,
  MdLocalGasStation,
  MdWarning,
  MdSignalWifi4Bar,
  MdSignalWifiOff,
  MdAccessTime,
  MdRoute,
  MdGpsFixed,
  MdGpsOff,
  MdAutoAwesome,
  MdNavigation,
} from 'react-icons/md';

/* ── Leaflet icon fix ───────────────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;
    background:linear-gradient(135deg,#3268ff,#9550e8);
    border:3px solid #fff;
    border-radius:50%;
    box-shadow:0 0 0 4px rgba(50,104,255,0.35);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const vehicleIcon = (status) => {
  const colors = { ACTIVE: '#22c55e', IDLE: '#f59e0b', STOPPED: '#ef4444', OFFLINE: '#94a3b8' };
  const c = colors[status] || colors.OFFLINE;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;
      background:${c};
      border:2px solid rgba(255,255,255,0.8);
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

/* ── Helper: recenter map ───────────────────────────────────── */
function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}

/* ── Utility ────────────────────────────────────────────────── */
function fmtTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtAge(date) {
  if (!date) return 'Unknown';
  const secs = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 5)   return 'Just now';
  if (secs < 60)  return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Status chip ────────────────────────────────────────────── */
function StatusChip({ status }) {
  const cfg = {
    ACTIVE:      { label: 'Active',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
    IDLE:        { label: 'Idle',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
    STOPPED:     { label: 'Stopped',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
    OFFLINE:     { label: 'Offline',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
    LIVE:        { label: 'Live',      color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
    STALE:       { label: 'Stale',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
    HISTORICAL:  { label: 'Historical',color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
    NO_DATA:     { label: 'No Data',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
  };
  const { label, color, bg, border } = cfg[status] || cfg.NO_DATA;
  return (
    <span style={{
      alignItems: 'center', background: bg, border: `1px solid ${border}`,
      borderRadius: 20, color, display: 'inline-flex', fontSize: 11,
      fontWeight: 700, gap: 5, padding: '3px 9px', whiteSpace: 'nowrap',
    }}>
      <span style={{ background: color, borderRadius: '50%', display: 'inline-block', height: 6, width: 6 }} />
      {label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════ */
const Tracking = () => {
  /* Fleet data */
  const [trackingData, setTrackingData] = useState([]);
  const [driverData, setDriverData] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  /* Live user location */
  const [liveTracking, setLiveTracking] = useState(false);
  const [userPos, setUserPos] = useState(null);
  const [userPath, setUserPath] = useState([]);
  const [locationError, setLocationError] = useState('');
  const [lastPositionTime, setLastPositionTime] = useState(null);
  const [distanceTraveled, setDistanceTraveled] = useState(0);

  /* Map center */
  const [mapCenter, setMapCenter] = useState(null);
  const [flyTo, setFlyTo] = useState(null);

  const watchId = useRef(null);
  const intervalRef = useRef(null);

  /* ── Fleet data polling ─────────────────────────────────── */
  const fetchFleet = useCallback(async () => {
    try {
      const { data } = await api.get('/tracking');
      setTrackingData(data);
      const drivers = await api.get('/drivers');
      setDriverData(drivers.data);
      setLastRefresh(new Date());
    } catch { /* silent */ }
    finally { setFleetLoading(false); }
  }, []);

  useEffect(() => {
    fetchFleet();
    intervalRef.current = setInterval(fetchFleet, 5000);
    return () => clearInterval(intervalRef.current);
  }, [fetchFleet]);

  useEffect(() => {
    if (!selectedVehicle) return;
    const refreshedSelection = trackingData.find((item) => item.vehicle.id === selectedVehicle.vehicle.id);
    if (refreshedSelection) setSelectedVehicle(refreshedSelection);
    else setSelectedVehicle(null);
  }, [trackingData, selectedVehicle]);

  /* default map center: first vehicle with GPS, else Mumbai */
  const firstLocatedVehicle = trackingData.find((item) => item.latest_gps?.latitude != null && item.latest_gps?.longitude != null);
  const defaultCenter = firstLocatedVehicle
    ? [firstLocatedVehicle.latest_gps.latitude, firstLocatedVehicle.latest_gps.longitude]
    : [19.0760, 72.8777];

  /* ── Live tracking controls ─────────────────────────────── */
  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationError('');
    setUserPath([]);
    setDistanceTraveled(0);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(newPos);
        setLastPositionTime(new Date());
        setLocationError('');
        setFlyTo(newPos);
        setUserPath((prev) => {
          if (prev.length > 0) {
            const dist = haversineKm(prev[prev.length - 1], newPos);
            setDistanceTraveled((d) => +(d + dist).toFixed(4));
          }
          return [...prev, newPos];
        });
      },
      (err) => {
        const msgs = {
          1: 'Location permission denied. Please allow location access in your browser settings.',
          2: 'Position unavailable. Make sure your device has GPS or network location enabled.',
          3: 'Location request timed out. Check your signal and try again.',
        };
        setLocationError(msgs[err.code] || `Location error: ${err.message}`);
        setLiveTracking(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    setLiveTracking(true);
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setLiveTracking(false);
  };

  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); }, []);

  /* ── Derived: stat counts ───────────────────────────────── */
  const activeCount  = trackingData.filter(d => d.vehicle.status === 'ACTIVE').length;
  const liveCount    = trackingData.filter(d => d.feed_status === 'LIVE').length;
  const offlineCount = trackingData.filter(d => d.feed_status === 'NO_DATA').length;

  return (
    <div className="tracking-page">
      {/* Header */}
      <div className="tracking-header">
        <div>
          <div className="tracking-eyebrow"><span /> REAL-TIME TRACKING</div>
          <h1>Live Fleet Tracking<span>.</span></h1>
          <p>Monitor GPS positions, track your live location, and verify vehicle feed status in real time.</p>
        </div>
        <div className="tracking-header-actions">
          <button
            className={`tracking-btn ${liveTracking ? 'danger' : 'primary'}`}
            onClick={liveTracking ? stopTracking : startTracking}
            id="live-tracking-toggle"
          >
            {liveTracking ? <><MdGpsOff size={18} /> Stop Tracking</> : <><MdGpsFixed size={18} /> Start Live Tracking</>}
          </button>
          <button className="tracking-btn subtle" onClick={fetchFleet} disabled={fleetLoading} id="fleet-refresh-btn">
            <MdRefresh size={18} className={fleetLoading ? 'spin-icon' : ''} />
            Refresh fleet
          </button>
        </div>
      </div>

      {/* Live tracking error */}
      {locationError && (
        <div className="tracking-alert error" role="alert">
          <MdLocationOff size={18} />
          <span>{locationError}</span>
        </div>
      )}

      {/* Stats bar */}
      <div className="tracking-stats-bar">
        <div className="tracking-stat">
          <MdDirectionsCar size={16} />
          <span>{trackingData.length}</span>
          <small>Total Vehicles</small>
        </div>
        <div className="tracking-stat active">
          <MdSignalWifi4Bar size={16} />
          <span>{activeCount}</span>
          <small>Active</small>
        </div>
        <div className="tracking-stat live">
          <MdLocationOn size={16} />
          <span>{liveCount}</span>
          <small>Live GPS</small>
        </div>
        <div className="tracking-stat offline">
          <MdSignalWifiOff size={16} />
          <span>{offlineCount}</span>
          <small>No Data</small>
        </div>
        {lastRefresh && (
          <div className="tracking-stat neutral">
            <MdAccessTime size={16} />
            <span>{fmtTime(lastRefresh)}</span>
            <small>Last refresh</small>
          </div>
        )}
      </div>

      {/* Live tracking info panel */}
      {(liveTracking || userPos) && (
        <div className={`live-tracking-panel ${liveTracking ? 'is-active' : 'is-inactive'}`}>
          <div className="live-panel-header">
            <span className={`live-dot ${liveTracking ? 'pulse' : ''}`} />
            <strong>{liveTracking ? 'Live tracking active' : 'Tracking stopped'}</strong>
            {liveTracking && <span className="live-badge">LIVE</span>}
          </div>
          <div className="live-panel-grid">
            <div className="live-panel-item">
              <MdMyLocation size={15} />
              <div>
                <label>Current Location</label>
                <span>
                  {userPos
                    ? `${userPos[0].toFixed(5)}, ${userPos[1].toFixed(5)}`
                    : 'Acquiring…'}
                </span>
              </div>
            </div>
            <div className="live-panel-item">
              <MdAccessTime size={15} />
              <div>
                <label>Last Updated</label>
                <span>{lastPositionTime ? fmtAge(lastPositionTime) : '—'}</span>
              </div>
            </div>
            <div className="live-panel-item">
              <MdRoute size={15} />
              <div>
                <label>Distance Traveled</label>
                <span>
                  {distanceTraveled < 1
                    ? `${(distanceTraveled * 1000).toFixed(0)} m`
                    : `${distanceTraveled.toFixed(2)} km`}
                </span>
              </div>
            </div>
            <div className="live-panel-item">
              <MdGpsFixed size={15} />
              <div>
                <label>Tracking Status</label>
                <StatusChip status={liveTracking ? 'LIVE' : 'STOPPED'} />
              </div>
            </div>
          </div>
          {userPos && (
            <button
              className="tracking-btn subtle sm"
              onClick={() => setFlyTo([...userPos])}
              style={{ marginTop: 10 }}
            >
              <MdMyLocation size={15} /> Center on my location
            </button>
          )}
        </div>
      )}

      {/* Main content: map + list */}
      <div className="tracking-main-grid">
        {/* Map */}
        <div className="tracking-map-card">
          <MapContainer
            center={userPos ?? defaultCenter}
            zoom={13}
            style={{ height: '100%', width: '100%', borderRadius: 14 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {flyTo && <RecenterMap center={flyTo} />}

            {/* User live marker and path trail */}
            {userPos && (
              <>
                <Marker position={userPos} icon={userIcon}>
                  <Popup>
                    <div style={{ color: '#111', minWidth: 140 }}>
                      <strong>📍 Your Location</strong>
                      <br />
                      {userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}
                      <br />
                      <small>Updated {lastPositionTime ? fmtAge(lastPositionTime) : '—'}</small>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={userPos}
                  radius={40}
                  pathOptions={{ color: '#3268ff', fillColor: '#3268ff', fillOpacity: 0.12, weight: 1.5 }}
                />
                {userPath.length > 1 && (
                  <Polyline
                    positions={userPath}
                    pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8, dashArray: '6, 6' }}
                  />
                )}
              </>
            )}

            {/* Fleet markers */}
            {trackingData.map((d) => {
              if (!d.latest_gps || d.latest_gps.latitude == null || d.latest_gps.longitude == null) return null;
              return (
                <Marker
                  key={d.vehicle.id}
                  position={[d.latest_gps.latitude, d.latest_gps.longitude]}
                  icon={vehicleIcon(d.vehicle.status)}
                  eventHandlers={{ click: () => setSelectedVehicle(d) }}
                >
                  <Popup>
                    <div style={{ color: '#111', minWidth: 180, fontSize: '12px' }}>
                      <strong style={{ fontSize: '14px', color: '#1e293b' }}>{d.vehicle.vehicle_id}</strong>
                      <div style={{ color: '#64748b', marginBottom: '4px' }}>{d.vehicle.registration_number || 'No reg.'}</div>
                      <div><strong>Status:</strong> {d.vehicle.status} ({d.feed_status})</div>
                      <div><strong>Speed:</strong> {Number(d.vehicle.current_speed || 0).toFixed(0)} km/h</div>
                      <div><strong>Fuel Level:</strong> {Number(d.vehicle.fuel_level || 0).toFixed(0)}%</div>
                      {d.active_journey && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#6366f1', fontWeight: 600 }}>Active Journey ({d.active_journey.journey_id}):</span>
                          <div>{d.active_journey.start_location} → <strong>{d.active_journey.end_location}</strong></div>
                          <div>Dist: {d.active_journey.distance || '—'} km · Est: {d.active_journey.duration || '—'} min</div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map legend */}
          <div className="map-legend">
            <span className="legend-dot" style={{ background: 'linear-gradient(135deg,#3268ff,#9550e8)' }} /> You
            <span className="legend-dot" style={{ background: '#22c55e' }} /> Active
            <span className="legend-dot" style={{ background: '#f59e0b' }} /> Idle
            <span className="legend-dot" style={{ background: '#ef4444' }} /> Stopped
            <span className="legend-dot" style={{ background: '#94a3b8' }} /> Offline
          </div>
        </div>

        {/* Fleet list */}
        <div className="tracking-fleet-list">
          <div className="fleet-list-header">
            <h3>Fleet status</h3>
            <small>{trackingData.length} vehicles · {driverData.filter((driver) => driver.status === 'ACTIVE').length} active drivers</small>
          </div>
          {fleetLoading ? (
            <div className="tracking-loading">
              <span className="loading-spinner" style={{ color: '#9c70ff' }} />
              <span>Loading fleet…</span>
            </div>
          ) : trackingData.length === 0 && !driverData.some((driver) => driver.status === 'ACTIVE') ? (
            <div className="tracking-empty">
              <MdDirectionsCar size={32} />
              <b>No vehicles found</b>
              <p>Import vehicle data from the dashboard to track your fleet.</p>
            </div>
          ) : (
            <div className="fleet-items">
              {trackingData.length === 0 && <div className="tracking-empty"><MdDirectionsCar size={28} /><b>No vehicles found</b><p>Import or add vehicles to track them here.</p></div>}
              {trackingData.map((d) => (
                <button
                  key={d.vehicle.id}
                  className={`fleet-item ${selectedVehicle?.vehicle.id === d.vehicle.id ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedVehicle(d);
                    if (d.latest_gps) setFlyTo([d.latest_gps.latitude, d.latest_gps.longitude]);
                  }}
                >
                  <div className="fleet-item-top">
                    <span className="fleet-item-id">{d.vehicle.vehicle_id}</span>
                  <StatusChip status={d.vehicle.status || 'OFFLINE'} />
                  </div>
                  <div className="fleet-item-meta">
                    <span>{d.vehicle.registration_number || 'No reg.'}</span>
                    {d.driver && <span>{d.driver.name}</span>}
                    <span><MdSpeed size={12} /> {Number(d.vehicle.current_speed || 0).toFixed(0)} km/h</span>
                    <span><MdLocalGasStation size={12} /> {Number(d.vehicle.fuel_level || 0).toFixed(0)}%</span>
                  </div>
                  {d.active_journey && (
                    <div style={{
                      fontSize: '11px',
                      color: '#a5b4fc',
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <MdNavigation size={12} style={{ transform: 'rotate(45deg)' }} />
                      <span>{d.active_journey.start_location} → <b>{d.active_journey.end_location}</b></span>
                    </div>
                  )}
                  {d.latest_gps && (
                    <div className="fleet-item-coords">
                      <MdLocationOn size={11} />
                      {d.latest_gps.latitude.toFixed(4)}, {d.latest_gps.longitude.toFixed(4)}
                      <span className="fleet-item-age">{fmtAge(d.latest_gps.timestamp)}</span>
                    </div>
                  )}
                  {!d.latest_gps && (
                    <div className="fleet-item-coords no-gps">
                      <MdLocationOff size={11} /> {d.feed_status === 'NO_DATA' ? 'Waiting for GPS data' : 'No GPS data available'}
                    </div>
                  )}
                </button>
              ))}
              <div className="fleet-list-header" style={{ margin: '12px -12px 0', borderTop: '1px solid rgba(255,255,255,.08)' }}>
                <h3>Active drivers</h3>
                <small>{driverData.filter((driver) => driver.status === 'ACTIVE').length}</small>
              </div>
              {driverData.filter((driver) => driver.status === 'ACTIVE').map((driver) => (
                <div key={driver.id} className="fleet-item" style={{ cursor: 'default' }}>
                  <div className="fleet-item-top">
                    <span className="fleet-item-id">{driver.name}</span>
                    <StatusChip status="ACTIVE" />
                  </div>
                  <div className="fleet-item-meta"><span>{driver.driver_id}</span><span>{driver.phone || 'No phone'}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vehicle detail modal */}
      {selectedVehicle && (
        <div
          className="modal modal-open tracking-detail-overlay"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedVehicle(null); }}
        >
          <div className="tracking-modal-box">
            <div className="tracking-modal-header">
              <div>
                <span className="tracking-modal-overline">VEHICLE DETAILS</span>
                <h3>{selectedVehicle.vehicle.vehicle_id}</h3>
              </div>
              <button className="tracking-modal-close" onClick={() => setSelectedVehicle(null)} aria-label="Close vehicle details">&times;</button>
            </div>

            <div className="tracking-modal-badges">
              <StatusChip status={selectedVehicle.vehicle.status} />
              <StatusChip status={selectedVehicle.feed_status || 'NO_DATA'} />
              {selectedVehicle.vehicle.risk_level && (
                <span className={`risk-badge ${selectedVehicle.vehicle.risk_level.toLowerCase()}`}>
                  <MdWarning size={11} /> {selectedVehicle.vehicle.risk_level} RISK
                </span>
              )}
            </div>

            <div className="tracking-modal-grid">
              {[
                ['Registration', selectedVehicle.vehicle.registration_number],
                ['Type', selectedVehicle.vehicle.vehicle_type],
                ['Make / Model', `${selectedVehicle.vehicle.make || '—'} ${selectedVehicle.vehicle.model || ''}`],
                ['Fuel Type', selectedVehicle.vehicle.fuel_type || '—'],
                ['Speed', `${Number(selectedVehicle.vehicle.current_speed || 0).toFixed(0)} km/h`],
                ['Fuel Level', `${Number(selectedVehicle.vehicle.fuel_level || 0).toFixed(0)}%`],
              ].map(([label, val]) => (
                <div key={label} className="tracking-modal-row">
                  <span>{label}</span>
                  <b>{val || '—'}</b>
                </div>
              ))}
            </div>

            {selectedVehicle.latest_gps && (
              <div className="tracking-modal-gps">
                <span className="tracking-modal-overline">GPS READING</span>
                <div className="tracking-modal-grid" style={{ marginTop: 10 }}>
                  {[
                    ['Latitude', Number(selectedVehicle.latest_gps.latitude).toFixed(6)],
                    ['Longitude', Number(selectedVehicle.latest_gps.longitude).toFixed(6)],
                    ['Speed', `${Number(selectedVehicle.latest_gps.speed || 0).toFixed(1)} km/h`],
                    ['Heading', `${Number(selectedVehicle.latest_gps.heading || 0).toFixed(0)}°`],
                    ['Altitude', `${Number(selectedVehicle.latest_gps.altitude || 0).toFixed(0)} m`],
                    ['Last GPS update', selectedVehicle.latest_gps.timestamp ? `${new Date(selectedVehicle.latest_gps.timestamp).toLocaleString()} · ${fmtAge(selectedVehicle.latest_gps.timestamp)}` : 'No timestamp'],
                  ].map(([label, val]) => (
                    <div key={label} className="tracking-modal-row">
                      <span>{label}</span>
                      <b>{val}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="tracking-modal-footer">
              {selectedVehicle.latest_gps && (
                <button
                  className="tracking-btn subtle sm"
                  onClick={() => {
                    setFlyTo([selectedVehicle.latest_gps.latitude, selectedVehicle.latest_gps.longitude]);
                    setSelectedVehicle(null);
                  }}
                >
                  <MdLocationOn size={15} /> Show on map
                </button>
              )}
              <button className="tracking-btn subtle sm" onClick={() => setSelectedVehicle(null)}>
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
