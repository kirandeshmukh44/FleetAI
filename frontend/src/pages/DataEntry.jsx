import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import '../styles/data-entry.css';
import { VALIDATION } from '../utils/validation';
import {
  MdDirectionsCar,
  MdPeople,
  MdRoute,
  MdAdd,
  MdClose,
  MdCheck,
  MdDelete,
  MdEdit,
  MdRefresh,
  MdWarning,
  MdSave,
  MdEditNote,
  MdAutoAwesome,
  MdAccessTime,
  MdLocalGasStation,
} from 'react-icons/md';

/* ── Tab definitions ────────────────────────────────────────── */
const TABS = [
  { key: 'vehicle', label: 'Vehicles', Icon: MdDirectionsCar },
  { key: 'driver',  label: 'Drivers',  Icon: MdPeople },
  { key: 'journey', label: 'Journeys', Icon: MdRoute },
];

/* ── City coordinates & distance lookup dictionary ──────────── */
const KNOWN_HUBS = {
  mumbai:    { lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
  pune:      { lat: 18.5204, lng: 73.8567, name: 'Pune' },
  solapur:   { lat: 17.6599, lng: 75.9064, name: 'Solapur' },
  nashik:    { lat: 19.9975, lng: 73.7898, name: 'Nashik' },
  aurangabad:{ lat: 19.8762, lng: 75.3433, name: 'Aurangabad' },
  nagpur:    { lat: 21.1458, lng: 79.0882, name: 'Nagpur' },
  thane:     { lat: 19.2183, lng: 72.9781, name: 'Thane' },
  kolhapur:  { lat: 16.7050, lng: 74.2433, name: 'Kolhapur' },
  delhi:     { lat: 28.6139, lng: 77.2090, name: 'Delhi' },
  bangalore: { lat: 12.9716, lng: 77.5946, name: 'Bangalore' },
  hyderabad: { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
  ahmedabad: { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad' },
  chennai:   { lat: 13.0827, lng: 80.2707, name: 'Chennai' },
  kolkata:   { lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
  vasai:     { lat: 19.3919, lng: 72.8397, name: 'Vasai' },
  andheri:   { lat: 19.1197, lng: 72.8464, name: 'Andheri' },
  borivali:  { lat: 19.2307, lng: 72.8567, name: 'Borivali' },
  dombivli:  { lat: 19.2183, lng: 73.0867, name: 'Dombivli' },
  kalyan:    { lat: 19.2437, lng: 73.1355, name: 'Kalyan' },
  powai:     { lat: 19.1176, lng: 72.9060, name: 'Powai' },
  thane:     { lat: 19.2183, lng: 72.9781, name: 'Thane' },
  mumbaiport:{ lat: 18.9388, lng: 72.8354, name: 'Mumbai Port' },
};

/* Known highway distances in km */
const DIRECT_DISTANCES = {
  'mumbai-pune': 150,
  'pune-mumbai': 150,
  'mumbai-solapur': 400,
  'solapur-mumbai': 400,
  'pune-solapur': 250,
  'solapur-pune': 250,
  'mumbai-nashik': 165,
  'nashik-mumbai': 165,
  'mumbai-nagpur': 815,
  'nagpur-mumbai': 815,
  'pune-nagpur': 710,
  'nagpur-pune': 710,
  'mumbai-kolhapur': 380,
  'kolhapur-mumbai': 380,
  'pune-kolhapur': 235,
  'kolhapur-pune': 235,
  'mumbai-thane': 35,
  'thane-mumbai': 35,
  'mumbai-delhi': 1410,
  'delhi-mumbai': 1410,
  'mumbai-bangalore': 985,
  'bangalore-mumbai': 985,
  'mumbai-hyderabad': 710,
  'hyderabad-mumbai': 710,
  'mumbai-ahmedabad': 525,
  'ahmedabad-mumbai': 525,
};

function calculateRouteStats(start, end, vehicleType) {
  if (!start || !end) return null;
  const s = start.trim().toLowerCase();
  const e = end.trim().toLowerCase();
  if (s === e) return null;

  const hubKeys = Object.keys(KNOWN_HUBS).sort((a, b) => b.length - a.length);
  let startKey = hubKeys.find((k) => s.includes(k) || k.includes(s));
  let endKey = hubKeys.find((k) => e.includes(k) || k.includes(e));

  let distanceKm = 0;
  if (startKey && endKey) {
    const pair = `${startKey}-${endKey}`;
    if (DIRECT_DISTANCES[pair]) {
      distanceKm = DIRECT_DISTANCES[pair];
    } else {
      // Haversine route approximation with 1.3x road winding factor
      const c1 = KNOWN_HUBS[startKey];
      const c2 = KNOWN_HUBS[endKey];
      const R = 6371;
      const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
      const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((c1.lat * Math.PI) / 180) *
          Math.cos((c2.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.28);
    }
  } else return null;

  // Speed estimation based on vehicle type
  const avgSpeed = vehicleType === 'Truck' ? 45 : vehicleType === 'Bus' ? 50 : 60; // km/h
  const durationMin = Math.max(1, Math.round((distanceKm / avgSpeed) * 60));

  // Fuel consumption: km/L curve
  const kmPerLiter =
    vehicleType === 'Truck'
      ? 4.0
      : vehicleType === 'Bus'
      ? 5.0
      : vehicleType === 'Van'
      ? 9.5
      : 14.0;
  const fuelLiters = +(distanceKm / kmPerLiter).toFixed(1);

  return { distance: distanceKm, duration: durationMin, fuel: fuelLiters };
}

function nextRecordId(prefix, records) {
  const idField = { VH: 'vehicle_id', DR: 'driver_id', JR: 'journey_id' }[prefix];
  const numbers = records
    .map((record) => Number(String(record[idField] || '').match(/(\d+)$/)?.[1]))
    .filter(Number.isFinite);
  return `${prefix}-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`;
}

function localDateTimeValue(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

/* ── Field configs ──────────────────────────────────────────── */
const VEHICLE_FIELDS = [
  { name: 'vehicle_id',          label: 'Vehicle ID',           type: 'text',   required: true,  placeholder: 'Format: VH-001' },
  { name: 'registration_number', label: 'Registration Number',  type: 'text',   required: true,  placeholder: 'Format: MH12AB1234' },
  { name: 'vehicle_type',        label: 'Vehicle Type',         type: 'select', required: true,  options: ['Truck', 'Van', 'Bus', 'Car', 'Motorcycle', 'Other'] },
  { name: 'make',                label: 'Make',                 type: 'text',   required: false, placeholder: 'e.g. Tata' },
  { name: 'model',               label: 'Model',                type: 'text',   required: false, placeholder: 'e.g. Ace' },
  { name: 'year',                label: 'Year',                 type: 'number', required: false, placeholder: 'e.g. 2022', min: 1900, max: 2100 },
  { name: 'fuel_type',           label: 'Fuel Type',            type: 'select', required: false, options: ['Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid'] },
  { name: 'status',              label: 'Status',               type: 'select', required: false, options: ['ACTIVE', 'IDLE', 'STOPPED', 'OFFLINE'] },
  { name: 'fuel_level',          label: 'Fuel Level (%)',       type: 'number', required: false, placeholder: '0–100', min: 0, max: 100 },
];

const DRIVER_FIELDS = [
  { name: 'driver_id',      label: 'Driver ID',         type: 'text',   required: true,  placeholder: 'Format: DR-001' },
  { name: 'name',           label: 'Full Name',         type: 'text',   required: true,  placeholder: 'e.g. Ravi Kumar' },
  { name: 'email',          label: 'Email',             type: 'email',  required: false, placeholder: 'driver@example.com' },
  { name: 'phone',          label: 'Phone',             type: 'tel',    required: false, placeholder: 'Format: 9876543210 or +91 9876543210' },
  { name: 'license_number', label: 'License Number',    type: 'text',   required: false, placeholder: 'Format: MH0120220012345' },
  { name: 'license_expiry', label: 'License Expiry',    type: 'date',   required: false },
  { name: 'status',         label: 'Status',            type: 'select', required: false, options: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'] },
  { name: 'risk_level',     label: 'Risk Level',        type: 'select', required: false, options: ['LOW', 'MEDIUM', 'HIGH'] },
];

const JOURNEY_FIELDS = [
  { name: 'journey_id',     label: 'Journey ID',          type: 'text',   required: true,  placeholder: 'e.g. JR-001' },
  { name: 'vehicle_id',     label: 'Assigned Vehicle',    type: 'vehicle_select', required: true },
  { name: 'driver_id',      label: 'Assigned Driver',     type: 'driver_select',  required: true },
  { name: 'start_location', label: 'Starting Point',      type: 'text',   required: true,  placeholder: 'e.g. Mumbai or Pune' },
  { name: 'end_location',   label: 'Ending Destination',  type: 'text',   required: true,  placeholder: 'e.g. Solapur, Nashik, or Delhi' },
  { name: 'start_time',     label: 'Departure Time',      type: 'datetime-local', required: true },
  { name: 'end_time',       label: 'Estimated Arrival',   type: 'datetime-local', required: false },
  { name: 'distance',       label: 'Distance (km)',        type: 'number', required: false, placeholder: 'Auto-calculated', min: 0 },
  { name: 'duration',       label: 'Duration (min)',       type: 'number', required: false, placeholder: 'Auto-calculated', min: 0 },
  { name: 'fuel_consumed',  label: 'Fuel Required (L)',    type: 'number', required: false, placeholder: 'Auto-calculated', min: 0 },
  { name: 'status',         label: 'Journey Status',       type: 'select', required: false, options: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
];

const CONFIG = {
  vehicle: {
    apiPath:  '/vehicles',
    fields:   VEHICLE_FIELDS,
    rowKey:   'vehicle_id',
    columns:  [
      { label: 'Vehicle ID',    key: 'vehicle_id' },
      { label: 'Registration',  key: 'registration_number' },
      { label: 'Type',          key: 'vehicle_type' },
      { label: 'Status',        key: 'status', chip: true },
      { label: 'Fuel',          key: 'fuel_level', suffix: '%' },
    ],
    defaultValues: { status: 'ACTIVE', fuel_level: 100 },
  },
  driver: {
    apiPath:  '/drivers',
    fields:   DRIVER_FIELDS,
    rowKey:   'driver_id',
    columns:  [
      { label: 'Driver ID',   key: 'driver_id' },
      { label: 'Name',        key: 'name' },
      { label: 'Phone',       key: 'phone' },
      { label: 'Risk',        key: 'risk_level', chip: true },
      { label: 'Status',      key: 'status', chip: true },
    ],
    defaultValues: { status: 'ACTIVE', risk_level: 'LOW' },
  },
  journey: {
    apiPath:  '/journeys',
    fields:   JOURNEY_FIELDS,
    rowKey:   'journey_id',
    columns:  [
      { label: 'Journey ID',     key: 'journey_id' },
      { label: 'Vehicle',        key: 'vehicle_label' },
      { label: 'Driver',         key: 'driver_name' },
      { label: 'Start Location', key: 'start_location' },
      { label: 'End Location',   key: 'end_location' },
      { label: 'Distance',       key: 'distance', suffix: ' km' },
      { label: 'Fuel',           key: 'fuel_consumed', suffix: ' L' },
      { label: 'Status',         key: 'status', chip: true },
    ],
    defaultValues: { status: 'IN_PROGRESS' },
  },
};

/* ── Chip ────────────────────────────────────────────────────── */
function Chip({ value }) {
  const colors = {
    ACTIVE:      { color: '#4ade80', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.22)' },
    IDLE:        { color: '#fcd34d', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
    STOPPED:     { color: '#fca5a5', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
    OFFLINE:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
    INACTIVE:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
    ON_LEAVE:    { color: '#fcd34d', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
    LOW:         { color: '#4ade80', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.22)' },
    MEDIUM:      { color: '#fcd34d', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
    HIGH:        { color: '#fca5a5', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
    COMPLETED:   { color: '#4ade80', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.22)' },
    IN_PROGRESS: { color: '#60a5fa', bg: 'rgba(50,104,255,0.1)', border: 'rgba(50,104,255,0.2)' },
    CANCELLED:   { color: '#fca5a5', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
  };
  const cfg = colors[value] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };
  return (
    <span style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 20,
      color: cfg.color, display: 'inline-flex', fontSize: 11, fontWeight: 700,
      padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      {value || '—'}
    </span>
  );
}

/* ── Field renderer ─────────────────────────────────────────── */
function FormField({ field, value, onChange, error, vehicleList = [], driverList = [] }) {
  const baseStyle = {
    background: '#0c0e18',
    border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 9,
    color: '#e9e9f0',
    display: 'block',
    fontSize: 13,
    marginTop: 6,
    minHeight: 40,
    padding: '0 12px',
    width: '100%',
    transition: 'border-color 0.18s',
  };
  const focusStyle = { outline: 'none', borderColor: error ? '#ef4444' : '#9a75ff' };

  if (field.type === 'vehicle_select') {
    return (
      <select
        id={`field-${field.name}`}
        value={value || ''}
        onChange={(e) => onChange(field.name, e.target.value)}
        style={baseStyle}
      >
        <option value="">Choose an available vehicle…</option>
        {!vehicleList.some((v) => ['ACTIVE', 'IDLE'].includes(v.status) || String(v.id) === String(value)) && <option value="" disabled>No active or idle vehicles available</option>}
        {vehicleList.filter((v) => ['ACTIVE', 'IDLE'].includes(v.status) || String(v.id) === String(value)).map((v) => (
          <option key={v.id} value={v.id}>
            {v.vehicle_id} — {v.registration_number} ({v.vehicle_type || 'Vehicle'}, Status: {v.status || 'READY'})
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'driver_select') {
    return (
      <select
        id={`field-${field.name}`}
        value={value || ''}
        onChange={(e) => onChange(field.name, e.target.value)}
        style={baseStyle}
      >
        <option value="">Choose an available driver…</option>
        {!driverList.some((d) => d.status === 'ACTIVE' || String(d.id) === String(value)) && <option value="" disabled>No active drivers available</option>}
        {driverList.filter((d) => d.status === 'ACTIVE' || String(d.id) === String(value)).map((d) => (
          <option key={d.id} value={d.id}>
            {d.driver_id} — {d.name} ({d.phone || 'No phone'}, Status: {d.status || 'AVAILABLE'})
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'select') {
    return (
      <select
        id={`field-${field.name}`}
        value={value || ''}
        onChange={(e) => onChange(field.name, e.target.value)}
        style={baseStyle}
        onFocus={(e) => Object.assign(e.target.style, focusStyle)}
        onBlur={(e) => Object.assign(e.target.style, { outline: 'none', borderColor: error ? '#ef4444' : 'rgba(255,255,255,0.12)' })}
      >
        <option value="">Select…</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  return (
    <input
      id={`field-${field.name}`}
      type={field.type}
      value={value ?? ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      placeholder={field.placeholder}
      required={field.required}
      min={field.min}
      max={field.max}
      style={baseStyle}
      onFocus={(e) => Object.assign(e.target.style, focusStyle)}
      onBlur={(e) => Object.assign(e.target.style, { outline: 'none', borderColor: error ? '#ef4444' : 'rgba(255,255,255,0.12)' })}
    />
  );
}

/* ══════════════════════════════════════════════════════════════ */
const DataEntry = () => {
  const [activeTab, setActiveTab] = useState('vehicle');
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: '', msg: '' });
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const cfg = CONFIG[activeTab];

  /* ── Fetch records & relations ────────────────────────────── */
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(cfg.apiPath);
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      setNotice({ type: 'error', msg: e.response?.data?.error || `Failed to load ${activeTab} records.` });
    } finally {
      setLoading(false);
    }
  }, [activeTab, cfg.apiPath]);

  // Load available vehicles and drivers for journey creation
  useEffect(() => {
    api.get('/vehicles').then((res) => setVehicles(res.data || [])).catch(() => {});
    api.get('/drivers').then((res) => setDrivers(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setRecords([]);
    setNotice({ type: '', msg: '' });
    setFormOpen(false);
    setEditingId(null);
    fetchRecords();
  }, [activeTab, fetchRecords]);

  /* ── Auto-calculation when start/end location or vehicle changes in Journey ── */
  useEffect(() => {
    if (activeTab !== 'journey' || !formOpen) return;
    const { start_location, end_location, vehicle_id, start_time } = formData;
    if (start_location && end_location && start_location.trim().length >= 2 && end_location.trim().length >= 2) {
      const chosenVehicle = vehicles.find((v) => String(v.id) === String(vehicle_id));
      const vType = chosenVehicle?.vehicle_type || 'Truck';
      const stats = calculateRouteStats(start_location, end_location, vType);
      if (stats) {
        setFormData((prev) => {
          let updated = {
            ...prev,
            distance: stats.distance,
            duration: stats.duration,
            fuel_consumed: stats.fuel,
          };
          // Calculate auto arrival time if departure is selected
          if (start_time) {
            const startDt = new Date(start_time);
            if (!isNaN(startDt.getTime())) {
              const arrivalDt = new Date(startDt.getTime() + stats.duration * 60000);
              const isoArrival = localDateTimeValue(arrivalDt);
              updated.end_time = isoArrival;
            }
          }
          return updated;
        });
        setAutoFilled(true);
      } else if (autoFilled) {
        setFormData((prev) => ({ ...prev, distance: '', duration: '', fuel_consumed: '', end_time: '' }));
        setAutoFilled(false);
      }
    } else if (autoFilled) {
      setFormData((prev) => ({ ...prev, distance: '', duration: '', fuel_consumed: '', end_time: '' }));
      setAutoFilled(false);
    }
  }, [formData.start_location, formData.end_location, formData.vehicle_id, formData.start_time, activeTab, formOpen, vehicles, autoFilled]);

  /* ── Form handlers ───────────────────────────────────────── */
  const openNewForm = () => {
    let defaults = { ...cfg.defaultValues };
    if (activeTab === 'vehicle') defaults.vehicle_id = nextRecordId('VH', records);
    if (activeTab === 'driver') defaults.driver_id = nextRecordId('DR', records);
    if (activeTab === 'journey') {
      defaults.start_time = localDateTimeValue(new Date());
      defaults.journey_id = nextRecordId('JR', records);
      const activeVehicles = vehicles.filter((vehicle) => ['ACTIVE', 'IDLE'].includes(vehicle.status));
      const activeDrivers = drivers.filter((driver) => driver.status === 'ACTIVE');
      if (activeVehicles.length > 0) defaults.vehicle_id = activeVehicles[0].id;
      if (activeDrivers.length > 0) defaults.driver_id = activeDrivers[0].id;
    }
    setFormData(defaults);
    setFormErrors({});
    setEditingId(null);
    setAutoFilled(false);
    setFormOpen(true);
    setNotice({ type: '', msg: '' });
  };

  const openEditForm = (record) => {
    setFormData({ ...record });
    setFormErrors({});
    setEditingId(record.id);
    setAutoFilled(false);
    setFormOpen(true);
    setNotice({ type: '', msg: '' });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormErrors({});
    setAutoFilled(false);
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  /* ── Validation ──────────────────────────────────────────── */
  const validate = () => {
    const errs = {};
    cfg.fields.forEach((f) => {
      const val = formData[f.name];
      if (f.required && (val === undefined || val === null || String(val).trim() === '')) {
        errs[f.name] = `${f.label} is required.`;
      }
      if (f.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errs[f.name] = 'Enter a valid email address.';
      }
      if (f.name === 'name' && val && !/^[A-Za-z][A-Za-z .'-]{1,99}$/.test(String(val).trim())) {
        errs[f.name] = 'Enter a valid name using letters and spaces.';
      }
      if (f.type === 'number' && val !== '' && val !== undefined && val !== null) {
        const n = Number(val);
        if (isNaN(n)) errs[f.name] = 'Must be a number.';
        else if (f.min !== undefined && n < f.min) errs[f.name] = `Minimum value is ${f.min}.`;
        else if (f.max !== undefined && n > f.max) errs[f.name] = `Maximum value is ${f.max}.`;
      }
    });

    // Vehicle-specific validations
    if (activeTab === 'vehicle') {
      // Registration number validation (Indian format: MH12AB1234)
      if (formData.registration_number) {
        const regUpper = String(formData.registration_number).trim().toUpperCase();
        if (!VALIDATION.registration.test(regUpper)) {
          errs.registration_number = 'Invalid format. Use format like MH12AB1234 or MH-12-AB-1234';
        }
      }
      // Vehicle ID validation
      if (formData.vehicle_id) {
        if (!VALIDATION.vehicleId.test(String(formData.vehicle_id).trim().toUpperCase())) {
          errs.vehicle_id = 'Invalid format. Use format like VH-001';
        }
      }
    }

    // Driver-specific validations
    if (activeTab === 'driver') {
      // Driver ID validation
      if (formData.driver_id) {
        if (!VALIDATION.driverId.test(String(formData.driver_id).trim().toUpperCase())) {
          errs.driver_id = 'Invalid format. Use format like DR-001';
        }
      }
      // Phone validation (Indian format)
      if (formData.phone) {
        if (!VALIDATION.phone.test(String(formData.phone).trim())) {
          errs.phone = 'Invalid phone number. Use 10-digit number like 9876543210 or +91 9876543210';
        }
      }
      // License number validation (Indian format)
      if (formData.license_number) {
        const licensePattern = /^[A-Z]{2}\d{2}\s?\d{11}$/;
        const licenseUpper = String(formData.license_number).trim().toUpperCase();
        if (!licensePattern.test(licenseUpper) && !licensePatternCompact.test(licenseUpper)) {
          errs.license_number = 'Invalid format. Use format like MH0120220012345';
        }
      }
    }

    // Journey-specific validations
    if (activeTab === 'journey') {
      // Journey ID validation
      if (formData.journey_id) {
        if (!VALIDATION.journeyId.test(String(formData.journey_id).trim().toUpperCase())) {
          errs.journey_id = 'Invalid format. Use format like JR-001';
        }
      }
      if (formData.start_time && formData.end_time
        && new Date(formData.end_time) <= new Date(formData.start_time)) {
        errs.end_time = 'Arrival time must be later than departure time.';
      }
    }

    return errs;
  };

  /* ── Submit ──────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    setSubmitting(true);
    setNotice({ type: '', msg: '' });

    const payload = {};
    cfg.fields.forEach((f) => {
      let v = formData[f.name];
      if (v === '' || v === undefined) v = null;
      if (f.type === 'number' && v !== null) v = Number(v);
      if (f.type === 'vehicle_select' || f.type === 'driver_select') v = Number(v);
      payload[f.name] = v;
    });

    try {
      if (editingId) {
        await api.put(`${cfg.apiPath}/${editingId}`, payload);
        setNotice({ type: 'success', msg: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} record updated successfully.` });
      } else {
        await api.post(cfg.apiPath, payload);
        setNotice({ type: 'success', msg: `New ${activeTab} added successfully.` });
      }
      closeForm();
      await fetchRecords();
      if (activeTab === 'vehicle' || activeTab === 'journey') {
        const { data } = await api.get('/vehicles');
        setVehicles(data || []);
      }
      if (activeTab === 'driver' || activeTab === 'journey') {
        const { data } = await api.get('/drivers');
        setDrivers(data || []);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Submission failed. Check your data and try again.';
      setNotice({ type: 'error', msg });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete ──────────────────────────────────────────────── */
  const handleDelete = async (id) => {
    try {
      await api.delete(`${cfg.apiPath}/${id}`);
      setNotice({ type: 'success', msg: 'Record deleted.' });
      setDeleteConfirm(null);
      await fetchRecords();
    } catch (err) {
      setNotice({ type: 'error', msg: err.response?.data?.error || 'Delete failed.' });
    }
  };

  return (
    <div className="de-page">
      {/* Header */}
      <div className="de-header">
        <div>
          <div className="de-eyebrow"><span /> DATA MANAGEMENT</div>
          <h1>Fleet Data Entry<span>.</span></h1>
          <p>Add, update, and manage vehicle telemetry, registered drivers, and dispatch journeys.</p>
        </div>
        <div className="de-header-actions">
          <button
            className="de-btn primary"
            onClick={openNewForm}
            id="add-record-btn"
          >
            <MdAdd size={18} /> Add {activeTab}
          </button>
          <button
            className="de-btn subtle"
            onClick={fetchRecords}
            disabled={loading}
            id="refresh-btn"
          >
            <MdRefresh size={18} className={loading ? 'spin-icon' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Notice */}
      {notice.msg && (
        <div className={`de-notice ${notice.type}`} role="status">
          <span className="de-notice-icon">
            {notice.type === 'success' ? <MdCheck size={16} /> : <MdWarning size={16} />}
          </span>
          <span>{notice.msg}</span>
          <button
            className="de-notice-close"
            onClick={() => setNotice({ type: '', msg: '' })}
            aria-label="Dismiss message"
          >
            <MdClose size={15} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="de-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`de-tab ${activeTab === tab.key ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.Icon size={17} />
            <span>{tab.label}</span>
            {records.length > 0 && activeTab === tab.key && (
              <span className="de-tab-count">{records.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Main card */}
      <div className="de-card">
        {loading ? (
          <div className="de-loading">
            <span className="loading-spinner" style={{ color: '#9c70ff' }} />
            <span>Loading {activeTab} records…</span>
          </div>
        ) : records.length === 0 ? (
          <div className="de-empty">
            <MdEditNote size={36} />
            <b>No {activeTab} records found</b>
            <p>Add your first {activeTab} using the button above.</p>
            <button className="de-btn primary" onClick={openNewForm}>
              <MdAdd size={16} /> Add {activeTab}
            </button>
          </div>
        ) : (
          <div className="de-table-wrap">
            <table className="de-table">
              <thead>
                <tr>
                  {cfg.columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id}>
                    {cfg.columns.map((col) => (
                      <td key={col.key}>
                        {col.chip
                          ? <Chip value={rec[col.key]} />
                          : `${rec[col.key] ?? '—'}${col.suffix || ''}`}
                      </td>
                    ))}
                    <td>
                      <div className="de-row-actions">
                        <button
                          className="de-icon-btn edit"
                          onClick={() => openEditForm(rec)}
                          title={`Edit ${activeTab}`}
                          aria-label={`Edit ${rec[cfg.rowKey]}`}
                        >
                          <MdEdit size={15} />
                        </button>
                        <button
                          className="de-icon-btn delete"
                          onClick={() => setDeleteConfirm(rec)}
                          title={`Delete ${activeTab}`}
                          aria-label={`Delete ${rec[cfg.rowKey]}`}
                        >
                          <MdDelete size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      {formOpen && (
        <div
          className="modal modal-open"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget && !submitting) closeForm(); }}
        >
          <div className="de-modal-box">
            <div className="de-modal-header">
              <div>
                <span className="de-modal-overline">
                  {editingId ? 'EDIT RECORD' : 'NEW RECORD'}
                </span>
                <h3>
                  {editingId ? 'Edit' : 'Add'} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h3>
              </div>
              <button
                className="de-modal-close"
                onClick={closeForm}
                disabled={submitting}
                aria-label="Close form"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Smart calculation banner for Journey */}
            {activeTab === 'journey' && autoFilled && (
              <div style={{
                background: 'linear-gradient(90deg, rgba(65, 142, 255, 0.12), rgba(168, 85, 247, 0.12))',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '12px',
                color: '#c4b5fd'
              }}>
                <MdAutoAwesome size={18} color="#a855f7" />
                <span>
                  <strong>Route estimate filled:</strong> Distance uses known hub locations, duration uses the selected vehicle type, and fuel is estimated from typical efficiency for that type. Confirm estimates before dispatch.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="de-form-grid">
                {cfg.fields.map((field) => (
                  <div
                    key={field.name}
                    className={`de-field ${field.type === 'textarea' ? 'de-field-full' : ''}`}
                  >
                    <label htmlFor={`field-${field.name}`} className="de-label">
                      {field.label}
                      {field.required && <span className="de-required">*</span>}
                    </label>
                    <FormField
                      field={field}
                      value={formData[field.name]}
                      onChange={handleChange}
                      error={formErrors[field.name]}
                      vehicleList={vehicles}
                      driverList={drivers}
                    />
                    {formErrors[field.name] && (
                      <span className="de-field-error">{formErrors[field.name]}</span>
                    )}
                  </div>
                ))}
              </div>
              {activeTab === 'journey' && formData.start_location && formData.end_location && !autoFilled && (
                <p className="de-form-hint">We couldn?t match both locations to a known hub. Enter distance, duration, and fuel manually, or use a recognized city such as Mumbai, Pune, Nashik, or Thane.</p>
              )}

              <div className="de-form-actions">
                <button
                  type="button"
                  className="de-btn subtle"
                  onClick={closeForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="de-btn primary"
                  disabled={submitting}
                  id="submit-form-btn"
                >
                  {submitting
                    ? <><span className="loading-spinner" style={{ color: 'white', width: '14px', height: '14px' }} /> Saving…</>
                    : <><MdSave size={16} /> {editingId ? 'Update' : 'Save'} record</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="modal modal-open"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className="de-confirm-box">
            <div className="de-confirm-icon"><MdDelete size={24} /></div>
            <h3>Delete record?</h3>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm[cfg.rowKey]}</strong>?
              This action cannot be undone.
            </p>
            <div className="de-confirm-actions">
              <button className="de-btn subtle" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="de-btn danger" onClick={() => handleDelete(deleteConfirm.id)}>
                <MdDelete size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataEntry;
