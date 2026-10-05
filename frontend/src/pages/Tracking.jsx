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
  MdNavigation,
  MdTrendingUp,
  MdFlight,
} from 'react-icons/md';

/* ── Leaflet icon fix ───────────────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/* ── Known city coordinates ─────────────────────────────────── */
const ROUTE_HUBS = {
  mumbai:     [19.0760, 72.8777], pune:       [18.5204, 73.8567],
  solapur:    [17.6599, 75.9064], nashik:     [19.9975, 73.7898],
  aurangabad: [19.8762, 75.3433], nagpur:     [21.1458, 79.0882],
  thane:      [19.2183, 72.9781], kolhapur:   [16.7050, 74.2433],
  delhi:      [28.6139, 77.2090], bangalore:  [12.9716, 77.5946],
  hyderabad:  [17.3850, 78.4867], ahmedabad:  [23.0225, 72.5714],
  chennai:    [13.0827, 80.2707], kolkata:    [22.5726, 88.3639],
  vasai:      [19.3919, 72.8397], andheri:    [19.1197, 72.8464],
  borivali:   [19.2307, 72.8567], kalyan:     [19.2437, 73.1355],
  powai:      [19.1176, 72.9060], dombivli:   [19.2183, 73.0867],
  surat:      [21.1702, 72.8311], jaipur:     [26.9124, 75.7873],
  lucknow:    [26.8467, 80.9462], bhopal:     [23.2599, 77.4126],
  indore:     [22.7196, 75.8577], patna:      [25.5941, 85.1376],
  chandigarh: [30.7333, 76.7794], amritsar:   [31.6340, 74.8723],
  coimbatore: [11.0168, 76.9558], kochi:      [9.9312,  76.2673],
  vizag:      [17.6868, 83.2185], bhubaneswar:[20.2961, 85.8245],
  guwahati:   [26.1445, 91.7362], ranchi:     [23.3441, 85.3096],
};

function hubPosition(location) {
  const name = String(location || '').toLowerCase();
  const key = Object.keys(ROUTE_HUBS)
    .sort((a, b) => b.length - a.length)
    .find((item) => name.includes(item));
  return key ? ROUTE_HUBS[key] : null;
}

function vehiclePosition(data) {
  const gps = data.latest_gps;
  if (gps?.latitude != null && gps?.longitude != null) {
    return [Number(gps.latitude), Number(gps.longitude)];
  }
  if (data.vehicle.last_location_lat != null && data.vehicle.last_location_lng != null) {
    return [Number(data.vehicle.last_location_lat), Number(data.vehicle.last_location_lng)];
  }
  return data.active_journey ? hubPosition(data.active_journey.start_location) : null;
}

function interpolatePosition(start, end, progress) {
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress,
  ];
}

function haversineKm([lat1, lng1], [lat2, lng2]) {
  const radius = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function positionAlongRoute(route, progress) {
  if (!route.length) return null;
  if (progress <= 0) return route[0];
  if (progress >= 1) return route[route.length - 1];
  const distances = route.slice(1).map((point, index) => haversineKm(route[index], point));
  const total = distances.reduce((sum, value) => sum + value, 0);
  let remaining = total * progress;
  for (let index = 0; index < distances.length; index += 1) {
    if (remaining <= distances[index]) {
      const segmentProgress = distances[index] ? remaining / distances[index] : 0;
      return interpolatePosition(route[index], route[index + 1], segmentProgress);
    }
    remaining -= distances[index];
  }
  return route[route.length - 1];
}

/* ── Vehicle icons ──────────────────────────────────────────── */
const vehicleIcon = (status, highlighted = false) => {
  const colors = { ACTIVE: '#22c55e', IDLE: '#f59e0b', STOPPED: '#ef4444', OFFLINE: '#94a3b8' };
  const c = colors[status] || colors.OFFLINE;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${highlighted ? 18 : 14}px;height:${highlighted ? 18 : 14}px;
      background:${c};
      border:2px solid rgba(255,255,255,0.9);
      border-radius:50%;
      box-shadow:${highlighted ? `0 0 0 8px ${c}44, 0 0 22px ${c}` : '0 2px 8px rgba(0,0,0,0.45)'};
      animation:${highlighted ? 'fleet-marker-pulse 1.2s ease-in-out infinite' : 'none'};
      transition: all 0.2s;
    "></div>`,
    iconSize: [highlighted ? 18 : 14, highlighted ? 18 : 14],
    iconAnchor: [highlighted ? 9 : 7, highlighted ? 9 : 7],
  });
};

const destinationIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;background:#111827;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 5px rgba(17,24,39,0.25);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

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
  if (secs < 5)    return 'Just now';
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function fmtDuration(minutes) {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* ── Status chip ────────────────────────────────────────────── */
function StatusChip({ status }) {
  const cfg = {
    ACTIVE:      { label: 'Active',     color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
    IDLE:        { label: 'Idle',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
    STOPPED:     { label: 'Stopped',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
    OFFLINE:     { label: 'Offline',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
    LIVE:        { label: 'Live',       color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
    STALE:       { label: 'Stale',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
    HISTORICAL:  { label: 'Historical', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
    NO_DATA:     { label: 'No Data',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
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
  const [trackingData, setTrackingData]   = useState([]);
  const [driverData, setDriverData]       = useState([]);
  const [fleetLoading, setFleetLoading]   = useState(true);
  const [fleetError, setFleetError]       = useState('');
  const [lastRefresh, setLastRefresh]     = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  /* UI state */

  /* Map */
  const [flyTo, setFlyTo]                     = useState(null);
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [journeyPosition, setJourneyPosition] = useState(null);
  const [journeyRoute, setJourneyRoute] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const completedJourneyRef = useRef(null);
  const intervalRef         = useRef(null);

  /* ── Fleet data polling ─────────────────────────────────── */
  const fetchFleet = useCallback(async () => {
    setFleetError('');
    const [trackingResult, driversResult] = await Promise.allSettled([
      api.get('/tracking'),
      api.get('/drivers'),
    ]);

    if (trackingResult.status === 'fulfilled') {
      setTrackingData(trackingResult.value.data);
    } else {
      const error = trackingResult.reason;
      const status = error?.response?.status;
      const responseMessage = error?.response?.data?.msg || error?.response?.data?.error;
      const msg = responseMessage || error?.message;
      if (status === 401) {
        setFleetError('Your session has expired. Please sign in again.');
      } else if (status) {
        setFleetError(`Vehicle locations could not be loaded (server returned ${status}).${msg ? ` ${msg}` : ''}`);
      } else {
        setFleetError(`Vehicle locations could not be loaded. ${msg || 'The tracking server is unavailable.'}`);
      }
    }
    if (driversResult.status === 'fulfilled') {
      setDriverData(driversResult.value.data);
    }
    if (trackingResult.status === 'fulfilled' || driversResult.status === 'fulfilled') {
      setLastRefresh(new Date());
    }
    setFleetLoading(false);
  }, []);

  useEffect(() => {
    fetchFleet();
    intervalRef.current = setInterval(fetchFleet, 8000);
    return () => clearInterval(intervalRef.current);
  }, [fetchFleet]);

  /* Keep selected vehicle in sync with polling refreshes */
  useEffect(() => {
    if (!selectedVehicle) return;
    const refreshed = trackingData.find((item) => item.vehicle.id === selectedVehicle.vehicle.id);
    if (refreshed) setSelectedVehicle(refreshed);
    else setSelectedVehicle(null);
  }, [trackingData]); // eslint-disable-line react-hooks/exhaustive-deps

  const routeVehicle = selectedVehicle
    || trackingData.find((item) => item.active_journey?.status === 'IN_PROGRESS');

  useEffect(() => {
    const journey = routeVehicle?.active_journey;
    const start = hubPosition(journey?.start_location);
    const destination = hubPosition(journey?.end_location);
    if (!journey || !start || !destination) {
      setJourneyRoute([]);
      return undefined;
    }

    const controller = new AbortController();
    const coordinates = `${start[1]},${start[0]};${destination[1]},${destination[0]}`;
    setRouteLoading(true);
    setJourneyRoute([start, destination]);
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Road route request failed');
        return response.json();
      })
      .then((payload) => {
        const points = payload.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]);
        if (points?.length > 1) setJourneyRoute(points);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') console.warn('Road route unavailable; using direct fallback.', error);
      })
      .finally(() => setRouteLoading(false));
    return () => controller.abort();
  }, [routeVehicle]);

  /* ── Journey position simulation ────────────────────────── */
  useEffect(() => {
    const journey = routeVehicle?.active_journey;
    if (!journey || journey.status !== 'IN_PROGRESS') {
      setJourneyProgress(0);
      setJourneyPosition(null);
      return undefined;
    }

    const vehicleStart = routeVehicle.latest_gps
      ? [routeVehicle.latest_gps.latitude, routeVehicle.latest_gps.longitude]
      : hubPosition(journey.start_location);
    const destination = hubPosition(journey.end_location);
    if (!vehicleStart || !destination || !journey.duration) return undefined;

    const startHub = hubPosition(journey.start_location) || vehicleStart;
    const durationMs = Number(journey.duration) * 60 * 1000;

    const updateJourney = async () => {
      const startedAt  = new Date(journey.start_time).getTime();
      const progress   = Math.min(1, Math.max(0, (Date.now() - startedAt) / durationMs));
      setJourneyProgress(progress);
      const position = positionAlongRoute(journeyRoute, progress)
        || interpolatePosition(startHub, destination, progress);
      setJourneyPosition(position);

      if (progress >= 1 && completedJourneyRef.current !== journey.id) {
        completedJourneyRef.current = journey.id;
        try {
          await api.put(`/journeys/${journey.id}`, { status: 'COMPLETED', end_time: new Date().toISOString() });
          await fetchFleet();
        } catch (err) {
          console.error('Could not auto-complete journey:', err);
        }
      }
    };

    updateJourney();
    const timer = setInterval(updateJourney, 1000);
    return () => clearInterval(timer);
  }, [routeVehicle, journeyRoute, fetchFleet]);

  /* ── Derived values ─────────────────────────────────────── */
  const defaultCenter    = [22.5937, 78.9629]; // India center
  const activeCount      = trackingData.filter(d => d.vehicle.status === 'ACTIVE').length;
  const liveCount        = trackingData.filter(d => d.feed_status === 'LIVE').length;
  const noDataCount      = trackingData.filter(d => d.feed_status === 'NO_DATA').length;

  const selectedJourney  = routeVehicle?.active_journey;
  const selectedDest     = selectedJourney ? hubPosition(selectedJourney.end_location) : null;
  const selectedStart    = selectedJourney
    ? (hubPosition(selectedJourney.start_location) || journeyPosition || defaultCenter)
    : null;

  return (
    <div className="tracking-page">
      {/* Header */}
      <div className="tracking-header">
        <div>
          <div className="tracking-eyebrow"><span /> REAL-TIME TRACKING</div>
          <h1>Live Fleet Tracking<span>.</span></h1>
          <p>Monitor your vehicles with live GPS positions, journey progress, and route intelligence.</p>
        </div>
        <div className="tracking-header-actions">
          <button className="tracking-btn subtle" onClick={fetchFleet} disabled={fleetLoading} id="fleet-refresh-btn">
            <MdRefresh size={18} className={fleetLoading ? 'spin-icon' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {fleetError && <div className="tracking-alert error" role="alert">{fleetError}</div>}

      {!trackingData.length && !fleetLoading && (
        <div className="tracking-empty standalone">
          <MdDirectionsCar size={32} />
          <b>No vehicles found</b>
          <p>Add a vehicle, driver, and journey from <strong>Data Entry</strong> to start tracking them here.</p>
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
          <span>{noDataCount}</span>
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

      {/* Active journey progress bar */}
      {selectedJourney && journeyPosition && selectedDest && (
        <div className="journey-progress-panel" role="status" aria-live="polite">
          <div className="journey-progress-heading">
            <div>
              <span className="tracking-eyebrow"><span /> LIVE JOURNEY SIMULATION</span>
              <strong>
                {routeVehicle.vehicle.vehicle_id}: {selectedJourney.start_location} → {selectedJourney.end_location}
              </strong>
            </div>
            <span className="journey-progress-value">{Math.round(journeyProgress * 100)}%</span>
          </div>
          <div className="journey-progress-track">
            <span style={{ width: `${journeyProgress * 100}%` }} />
          </div>
          <div className="journey-progress-meta">
            <span>
              {(Number(selectedJourney.distance || 0) * journeyProgress).toFixed(1)} / {Number(selectedJourney.distance || 0).toFixed(1)} km
            </span>
            <span>
              ETA: {new Date(
                new Date(selectedJourney.start_time).getTime() + Number(selectedJourney.duration) * 60000
              ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>{journeyProgress >= 1 ? '✓ Journey complete' : 'Position updates every second'}</span>
          </div>
        </div>
      )}

      {/* Main content: map + fleet list */}
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

            {flyTo && <RecenterMap center={flyTo} zoom={8} />}

            {/* ── Active journey route line ── */}
            {selectedJourney && journeyPosition && selectedDest && (
              <>
                <Polyline
                  positions={[selectedStart, selectedDest]}
                  pathOptions={{ color: '#818cf8', weight: 4, opacity: 0.55, dashArray: '8, 6' }}
                />
                <Marker position={selectedDest} icon={destinationIcon}>
                  <Popup>
                    <strong>Destination</strong><br />{selectedJourney.end_location}
                  </Popup>
                </Marker>
              </>
            )}

            {/* ── Vehicle markers ── */}
            {trackingData.map((d) => {
              const isActive = routeVehicle?.vehicle.id === d.vehicle.id && journeyPosition;
              const isFocused = selectedVehicle?.vehicle.id === d.vehicle.id;

              // Determine position: simulated > GPS > last_location from vehicle data
              let markerPos = null;
              if (isActive) {
                markerPos = journeyPosition;
              } else {
                markerPos = vehiclePosition(d);
              }

              if (!markerPos) return null;

              return (
                <Marker
                  key={d.vehicle.id}
                  position={markerPos}
                  icon={vehicleIcon(d.vehicle.status, isFocused)}
                  eventHandlers={{
                    click: () => {
                      setSelectedVehicle(d);
                      setFlyTo([...markerPos]);
                    },
                  }}
                >
                  <Popup>
                    <div style={{ color: '#111', minWidth: 190, fontSize: '12px', lineHeight: 1.6 }}>
                      <strong style={{ fontSize: '14px', color: '#1e293b' }}>{d.vehicle.vehicle_id}</strong>
                      <div style={{ color: '#64748b', marginBottom: '4px' }}>{d.vehicle.registration_number || 'No reg.'}</div>
                      {d.driver && <div><strong>Driver:</strong> {d.driver.name}</div>}
                      <div><strong>Status:</strong> {d.vehicle.status} · <em>{isActive ? 'Route simulation' : d.feed_status}</em></div>
                      <div><strong>Speed:</strong> {Number(d.vehicle.current_speed || 0).toFixed(0)} km/h</div>
                      <div><strong>Fuel:</strong> {Number(d.vehicle.fuel_level || 0).toFixed(0)}%</div>
                      {d.active_journey && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#6366f1', fontWeight: 600 }}>
                            Journey ({d.active_journey.journey_id}):
                          </span>
                          <div>{d.active_journey.start_location} → <strong>{d.active_journey.end_location}</strong></div>
                          <div>
                            {d.active_journey.distance || '—'} km ·
                            {fmtDuration(d.active_journey.duration)}
                          </div>
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

        {/* Right panel: fleet list */}
        <div className="tracking-fleet-list">
          <div className="fleet-list-header">
                <h3>Fleet status</h3>
                <small>
                  {trackingData.length} vehicle{trackingData.length !== 1 ? 's' : ''} ·&nbsp;
                  {driverData.filter(d => d.status === 'ACTIVE').length} active drivers
                </small>
              </div>

              {fleetLoading ? (
                <div className="tracking-loading">
                  <span className="loading-spinner" style={{ color: '#9c70ff' }} />
                  <span>Loading fleet…</span>
                </div>
              ) : trackingData.length === 0 && !driverData.some(d => d.status === 'ACTIVE') ? (
                <div className="tracking-empty">
                  <MdDirectionsCar size={32} />
                  <b>No vehicles found</b>
                  <p>Add a vehicle, driver, and journey from Data Entry to start tracking.</p>
                </div>
              ) : (
                <div className="fleet-items">
                  {trackingData.length === 0 && (
                    <div className="tracking-empty">
                      <MdDirectionsCar size={28} />
                      <b>No vehicles found</b>
                      <p>Add a vehicle, driver, and journey from Data Entry.</p>
                    </div>
                  )}

                  {trackingData.map((d) => (
                    <button
                      key={d.vehicle.id}
                      className={`fleet-item ${selectedVehicle?.vehicle.id === d.vehicle.id ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSelectedVehicle(d);
                        const pos = vehiclePosition(d);
                        if (pos) setFlyTo(pos);
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
                          fontSize: '11px', color: '#a5b4fc',
                          background: 'rgba(99,102,241,0.12)',
                          border: '1px solid rgba(99,102,241,0.25)',
                          borderRadius: '6px', padding: '3px 8px', marginTop: '4px',
                          display: 'flex', alignItems: 'center', gap: '5px',
                        }}>
                          <MdNavigation size={12} style={{ transform: 'rotate(45deg)' }} />
                          <span>{d.active_journey.start_location} → <b>{d.active_journey.end_location}</b></span>
                          <span style={{ marginLeft: 'auto', opacity: 0.7 }}>
                            {Number(d.active_journey.distance || 0).toFixed(0)} km
                          </span>
                        </div>
                      )}
                      {d.latest_gps ? (
                        <div className="fleet-item-coords">
                          <MdLocationOn size={11} />
                          {Number(d.latest_gps.latitude).toFixed(4)}, {Number(d.latest_gps.longitude).toFixed(4)}
                          <span className="fleet-item-age">{fmtAge(d.latest_gps.timestamp)}</span>
                        </div>
                      ) : (
                        <div className="fleet-item-coords no-gps">
                          <MdLocationOn size={11} />
                          {d.active_journey ? 'Route simulation active' : 'Waiting for GPS data'}
                        </div>
                      )}
                    </button>
                  ))}

                  {/* Active drivers section */}
                  {driverData.filter(d => d.status === 'ACTIVE').length > 0 && (
                    <>
                      <div className="fleet-list-header" style={{ margin: '12px -12px 0', borderTop: '1px solid rgba(255,255,255,.08)' }}>
                        <h3>Active drivers</h3>
                        <small>{driverData.filter(d => d.status === 'ACTIVE').length}</small>
                      </div>
                      {driverData.filter(d => d.status === 'ACTIVE').map((driver) => (
                        <div key={driver.id} className="fleet-item" style={{ cursor: 'default' }}>
                          <div className="fleet-item-top">
                            <span className="fleet-item-id">{driver.name}</span>
                            <StatusChip status="ACTIVE" />
                          </div>
                          <div className="fleet-item-meta">
                            <span>{driver.driver_id}</span>
                            <span>{driver.phone || 'No phone'}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

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
                ['Registration',  selectedVehicle.vehicle.registration_number],
                ['Type',          selectedVehicle.vehicle.vehicle_type],
                ['Make / Model',  `${selectedVehicle.vehicle.make || '—'} ${selectedVehicle.vehicle.model || ''}`],
                ['Fuel Type',     selectedVehicle.vehicle.fuel_type || '—'],
                ['Speed',         `${Number(selectedVehicle.vehicle.current_speed || 0).toFixed(0)} km/h`],
                ['Fuel Level',    `${Number(selectedVehicle.vehicle.fuel_level || 0).toFixed(0)}%`],
              ].map(([label, val]) => (
                <div key={label} className="tracking-modal-row">
                  <span>{label}</span><b>{val || '—'}</b>
                </div>
              ))}
            </div>

            {selectedVehicle.active_journey && (
              <div className="tracking-modal-gps">
                <span className="tracking-modal-overline">ACTIVE JOURNEY</span>
                <div className="tracking-modal-grid" style={{ marginTop: 10 }}>
                  {[
                    ['Journey ID',   selectedVehicle.active_journey.journey_id],
                    ['From',         selectedVehicle.active_journey.start_location],
                    ['To',           selectedVehicle.active_journey.end_location],
                    ['Distance',     `${selectedVehicle.active_journey.distance || 0} km`],
                    ['Est. Duration',fmtDuration(selectedVehicle.active_journey.duration)],
                    ['Progress',     `${Math.round(journeyProgress * 100)}%`],
                  ].map(([label, val]) => (
                    <div key={label} className="tracking-modal-row">
                      <span>{label}</span><b>{val || '—'}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedVehicle.latest_gps && (
              <div className="tracking-modal-gps">
                <span className="tracking-modal-overline">GPS READING</span>
                <div className="tracking-modal-grid" style={{ marginTop: 10 }}>
                  {[
                    ['Latitude',       Number(selectedVehicle.latest_gps.latitude).toFixed(6)],
                    ['Longitude',      Number(selectedVehicle.latest_gps.longitude).toFixed(6)],
                    ['Speed',          `${Number(selectedVehicle.latest_gps.speed || 0).toFixed(1)} km/h`],
                    ['Heading',        `${Number(selectedVehicle.latest_gps.heading || 0).toFixed(0)}°`],
                    ['Altitude',       `${Number(selectedVehicle.latest_gps.altitude || 0).toFixed(0)} m`],
                    ['Last GPS update', selectedVehicle.latest_gps.timestamp
                      ? `${new Date(selectedVehicle.latest_gps.timestamp).toLocaleString()} · ${fmtAge(selectedVehicle.latest_gps.timestamp)}`
                      : 'No timestamp'],
                  ].map(([label, val]) => (
                    <div key={label} className="tracking-modal-row">
                      <span>{label}</span><b>{val}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="tracking-modal-footer">
              {(selectedVehicle.latest_gps || (selectedVehicle.vehicle.last_location_lat != null)) && (
                <button
                  className="tracking-btn subtle sm"
                  onClick={() => {
                    const pos = selectedVehicle.latest_gps
                      ? [selectedVehicle.latest_gps.latitude, selectedVehicle.latest_gps.longitude]
                      : [selectedVehicle.vehicle.last_location_lat, selectedVehicle.vehicle.last_location_lng];
                    setFlyTo(pos);
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
