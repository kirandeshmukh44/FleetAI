import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import '../styles/tracking.css';
import {
  MdLocationOn,
  MdRefresh,
  MdDirectionsCar,
  MdSpeed,
  MdLocalGasStation,
  MdWarning,
  MdSignalWifi4Bar,
  MdSignalWifiOff,
  MdAccessTime,
  MdRoute,
  MdNavigation,
} from 'react-icons/md';

/* ── Leaflet icon fix ───────────────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const vehicleIcon = (status, highlighted = false) => {
  const colors = { ACTIVE: '#22c55e', IDLE: '#f59e0b', STOPPED: '#ef4444', OFFLINE: '#94a3b8' };
  const c = colors[status] || colors.OFFLINE;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;
      background:${c};
      border:2px solid rgba(255,255,255,0.8);
      border-radius:50%;
      box-shadow:${highlighted ? `0 0 0 8px ${c}55, 0 0 18px ${c}` : '0 2px 8px rgba(0,0,0,0.4)'};
      animation:${highlighted ? 'fleet-marker-pulse 1s ease-in-out infinite' : 'none'};
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

const ROUTE_HUBS = {
  mumbai: [19.0760, 72.8777], pune: [18.5204, 73.8567], solapur: [17.6599, 75.9064],
  nashik: [19.9975, 73.7898], aurangabad: [19.8762, 75.3433], nagpur: [21.1458, 79.0882],
  thane: [19.2183, 72.9781], kolhapur: [16.7050, 74.2433], delhi: [28.6139, 77.2090],
  bangalore: [12.9716, 77.5946], hyderabad: [17.3850, 78.4867], ahmedabad: [23.0225, 72.5714],
  chennai: [13.0827, 80.2707], kolkata: [22.5726, 88.3639],
};

const DEMO_FLEET_POSITIONS = [
  [28.6139, 77.2090], [19.0760, 72.8777], [12.9716, 77.5946],
  [22.5726, 88.3639], [17.3850, 78.4867], [23.0225, 72.5714],
  [18.5204, 73.8567], [13.0827, 80.2707], [26.9124, 75.7873],
  [26.8467, 80.9462],
];

function demoFleetPosition(index, tick = 0) {
  const base = DEMO_FLEET_POSITIONS[index % DEMO_FLEET_POSITIONS.length];
  const phase = (tick + index * 19) / 18;
  return [base[0] + Math.sin(phase) * 0.035, base[1] + Math.cos(phase) * 0.035];
}

const DEMO_FLEET = DEMO_FLEET_POSITIONS.map((_, index) => ({
  vehicle: {
    id: index + 1,
    vehicle_id: `VH-${String(index + 1).padStart(3, '0')}`,
    registration_number: `MH-${String(12 + index).padStart(2, '0')}-AB-${String(1234 + index).padStart(4, '0')}`,
    vehicle_type: index % 3 === 0 ? 'Truck' : index % 3 === 1 ? 'Van' : 'Bus',
    status: index % 4 === 0 ? 'IDLE' : 'ACTIVE',
    current_speed: 35 + (index * 7) % 45,
    fuel_level: 58 + (index * 4) % 40,
    risk_level: index % 5 === 0 ? 'MEDIUM' : 'LOW',
  },
  driver: {
    id: index + 1,
    driver_id: `DR-${String(index + 1).padStart(3, '0')}`,
    name: ['Aarav Patil', 'Rohan Sharma', 'Vikram Singh', 'Neha Joshi', 'Aditya More'][index % 5],
    status: 'ACTIVE',
    phone: '+91 98765 43210',
  },
  latest_gps: null,
  active_journey: null,
  feed_status: 'NO_DATA',
  age_seconds: null,
}));

function hubPosition(location) {
  const name = String(location || '').toLowerCase();
  const key = Object.keys(ROUTE_HUBS).sort((a, b) => b.length - a.length).find((item) => name.includes(item));
  return key ? ROUTE_HUBS[key] : null;
}

function interpolatePosition(start, end, progress) {
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress,
  ];
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
  const [demoTick, setDemoTick] = useState(0);

  /* Map center */
  const [mapCenter, setMapCenter] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [journeyPosition, setJourneyPosition] = useState(null);
  const completedJourneyRef = useRef(null);

  const intervalRef = useRef(null);
  const displayTrackingData = trackingData.length ? trackingData : DEMO_FLEET;
  const displayDriverData = driverData.length ? driverData : DEMO_FLEET.map((item) => item.driver);

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
    const timer = setInterval(() => setDemoTick((value) => value + 1), 1500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedVehicle) return;
    const refreshedSelection = displayTrackingData.find((item) => item.vehicle.id === selectedVehicle.vehicle.id);
    if (refreshedSelection) setSelectedVehicle(refreshedSelection);
    else setSelectedVehicle(null);
  }, [displayTrackingData, selectedVehicle]);

  /* Simulate an active journey between its known hubs using elapsed time. */
  useEffect(() => {
    const journey = selectedVehicle?.active_journey;
    if (!journey || journey.status !== 'IN_PROGRESS') {
      setJourneyProgress(0);
      setJourneyPosition(null);
      return undefined;
    }

    const vehicleStart = selectedVehicle.latest_gps
      ? [selectedVehicle.latest_gps.latitude, selectedVehicle.latest_gps.longitude]
      : hubPosition(journey.start_location);
    const destination = hubPosition(journey.end_location);
    if (!vehicleStart || !destination || !journey.duration) return undefined;

    const start = hubPosition(journey.start_location) || vehicleStart;
    const durationMs = Number(journey.duration) * 60 * 1000;
    const updateJourney = async () => {
      const startedAt = new Date(journey.start_time).getTime();
      const progress = Math.min(1, Math.max(0, (Date.now() - startedAt) / durationMs));
      setJourneyProgress(progress);
      const position = interpolatePosition(start, destination, progress);
      setJourneyPosition(position);
      if (progress >= 1 && completedJourneyRef.current !== journey.id) {
        completedJourneyRef.current = journey.id;
        try {
          await api.put(`/journeys/${journey.id}`, { status: 'COMPLETED', end_time: new Date().toISOString() });
          await fetchFleet();
        } catch (error) {
          console.error('Could not mark journey complete:', error);
        }
      }
    };

    updateJourney();
    const timer = setInterval(updateJourney, 1000);
    return () => clearInterval(timer);
  }, [selectedVehicle, fetchFleet]);

  /* default map center: first vehicle with GPS, else Mumbai */
  const defaultCenter = [22.5937, 78.9629];

  /* ── Derived: stat counts ───────────────────────────────── */
  const activeCount  = displayTrackingData.filter(d => d.vehicle.status === 'ACTIVE').length;
  const liveCount    = displayTrackingData.filter(d => d.feed_status === 'LIVE').length;
  const offlineCount = displayTrackingData.filter(d => d.feed_status === 'NO_DATA').length;
  const selectedJourney = selectedVehicle?.active_journey;
  const selectedDestination = selectedJourney ? hubPosition(selectedJourney.end_location) : null;
  const selectedStart = selectedJourney
    ? (hubPosition(selectedJourney.start_location) || journeyPosition || defaultCenter)
    : null;

  return (
    <div className="tracking-page">
      {/* Header */}
      <div className="tracking-header">
        <div>
          <div className="tracking-eyebrow"><span /> REAL-TIME TRACKING</div>
          <h1>Live Fleet Tracking<span>.</span></h1>
          <p>Monitor your vehicles and assigned drivers with live GPS positions and journey progress.</p>
        </div>
        <div className="tracking-header-actions">
          <button className="tracking-btn subtle" onClick={fetchFleet} disabled={fleetLoading} id="fleet-refresh-btn">
            <MdRefresh size={18} className={fleetLoading ? 'spin-icon' : ''} />
            Refresh vehicle locations
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {!trackingData.length && !fleetLoading && (
        <div className="tracking-demo-notice" role="status">
          <span className="live-dot pulse" /> Demo fleet preview: vehicle markers are moving across India until live GPS data is available.
        </div>
      )}
      <div className="tracking-stats-bar">
        <div className="tracking-stat">
          <MdDirectionsCar size={16} />
          <span>{displayTrackingData.length}</span>
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
      {selectedJourney && journeyPosition && selectedDestination && (
        <div className="journey-progress-panel" role="status" aria-live="polite">
          <div className="journey-progress-heading">
            <div>
              <span className="tracking-eyebrow"><span /> ACTIVE JOURNEY SIMULATION</span>
              <strong>{selectedVehicle.vehicle.vehicle_id}: {selectedJourney.start_location} → {selectedJourney.end_location}</strong>
            </div>
            <span className="journey-progress-value">{Math.round(journeyProgress * 100)}%</span>
          </div>
          <div className="journey-progress-track"><span style={{ width: `${journeyProgress * 100}%` }} /></div>
          <div className="journey-progress-meta">
            <span>{(Number(selectedJourney.distance || 0) * journeyProgress).toFixed(1)} / {Number(selectedJourney.distance || 0).toFixed(1)} km</span>
            <span>ETA: {new Date(new Date(selectedJourney.start_time).getTime() + Number(selectedJourney.duration) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>{journeyProgress >= 1 ? 'Journey complete' : 'Location updates every second'}</span>
          </div>
        </div>
      )}

      {/* Main content: map + list */}
      <div className="tracking-main-grid">
        {/* Map */}
        <div className="tracking-map-card">
          <MapContainer
            center={defaultCenter}
            zoom={5}
            style={{ height: '100%', width: '100%', borderRadius: 14 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {flyTo && <RecenterMap center={flyTo} />}

            {selectedJourney && journeyPosition && selectedDestination && (
              <>
                <Polyline positions={[selectedStart, selectedDestination]} pathOptions={{ color: '#818cf8', weight: 4, opacity: 0.5, dashArray: '8, 8' }} />
                <Marker position={selectedDestination} icon={userIcon}>
                  <Popup><strong>Destination</strong><br />{selectedJourney.end_location}</Popup>
                </Marker>
                <Marker position={journeyPosition} icon={vehicleIcon('ACTIVE')}>
                  <Popup><strong>{selectedVehicle.vehicle.vehicle_id}</strong><br />{Math.round(journeyProgress * 100)}% of journey complete</Popup>
                </Marker>
              </>
            )}

            {/* Fleet markers */}
            {displayTrackingData.map((d) => {
              const hasGps = d.latest_gps && d.latest_gps.latitude != null && d.latest_gps.longitude != null;
              const basePosition = hasGps
                ? [d.latest_gps.latitude, d.latest_gps.longitude]
                : demoFleetPosition(d.vehicle.id - 1, demoTick);
              const isSimulated = selectedVehicle?.vehicle.id === d.vehicle.id && journeyPosition;
              const markerPosition = isSimulated ? journeyPosition : basePosition;
              const isFocused = selectedVehicle?.vehicle.id === d.vehicle.id;
              return (
                <Marker
                  key={d.vehicle.id}
                  position={markerPosition}
                  icon={vehicleIcon(d.vehicle.status, isFocused)}
                  eventHandlers={{
                    click: () => {
                      setSelectedVehicle(d);
                      setFlyTo([...markerPosition]);
                    },
                  }}
                >
                  <Popup>
                    <div style={{ color: '#111', minWidth: 180, fontSize: '12px' }}>
                      <strong style={{ fontSize: '14px', color: '#1e293b' }}>{d.vehicle.vehicle_id}</strong>
                      <div style={{ color: '#64748b', marginBottom: '4px' }}>{d.vehicle.registration_number || 'No reg.'}</div>
                      {d.driver && <div><strong>Driver:</strong> {d.driver.name}</div>}
                      <div><strong>Status:</strong> {d.vehicle.status} ({hasGps ? d.feed_status : 'DEMO GPS'})</div>
                      <div><strong>Speed:</strong> {Number(d.vehicle.current_speed || 0).toFixed(0)} km/h</div>
                      <div><strong>Fuel Level:</strong> {Number(d.vehicle.fuel_level || 0).toFixed(0)}%</div>
                      {!hasGps && <div style={{ color: '#64748b', marginTop: '5px' }}>Demo fleet location for map preview</div>}
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
            <small>{displayTrackingData.length} vehicles · {displayDriverData.filter((driver) => driver.status === 'ACTIVE').length} active drivers</small>
          </div>
          {fleetLoading ? (
            <div className="tracking-loading">
              <span className="loading-spinner" style={{ color: '#9c70ff' }} />
              <span>Loading fleet…</span>
            </div>
          ) : displayTrackingData.length === 0 && !displayDriverData.some((driver) => driver.status === 'ACTIVE') ? (
            <div className="tracking-empty">
              <MdDirectionsCar size={32} />
              <b>No vehicles found</b>
              <p>Import vehicle data from the dashboard to track your fleet.</p>
            </div>
          ) : (
            <div className="fleet-items">
              {displayTrackingData.length === 0 && <div className="tracking-empty"><MdDirectionsCar size={28} /><b>No vehicles found</b><p>Import or add vehicles to track them here.</p></div>}
              {displayTrackingData.map((d) => (
                <button
                  key={d.vehicle.id}
                  className={`fleet-item ${selectedVehicle?.vehicle.id === d.vehicle.id ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedVehicle(d);
                    const position = d.latest_gps
                      ? [d.latest_gps.latitude, d.latest_gps.longitude]
                      : demoFleetPosition(d.vehicle.id - 1, demoTick);
                    setFlyTo(position);
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
                      <MdLocationOn size={11} /> Demo GPS · India map preview
                    </div>
                  )}
                </button>
              ))}
              <div className="fleet-list-header" style={{ margin: '12px -12px 0', borderTop: '1px solid rgba(255,255,255,.08)' }}>
                <h3>Active drivers</h3>
                <small>{displayDriverData.filter((driver) => driver.status === 'ACTIVE').length}</small>
              </div>
              {displayDriverData.filter((driver) => driver.status === 'ACTIVE').map((driver) => (
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
