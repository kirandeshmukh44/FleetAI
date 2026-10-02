import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import '../styles/data-entry.css';
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
} from 'react-icons/md';

/* ── Tab definitions ────────────────────────────────────────── */
const TABS = [
  { key: 'vehicle', label: 'Vehicles', Icon: MdDirectionsCar },
  { key: 'driver',  label: 'Drivers',  Icon: MdPeople },
  { key: 'journey', label: 'Journeys', Icon: MdRoute },
];

/* ── Field configs ──────────────────────────────────────────── */
const VEHICLE_FIELDS = [
  { name: 'vehicle_id',          label: 'Vehicle ID',           type: 'text',   required: true,  placeholder: 'e.g. VH-001' },
  { name: 'registration_number', label: 'Registration Number',  type: 'text',   required: true,  placeholder: 'e.g. MH12AB1234' },
  { name: 'vehicle_type',        label: 'Vehicle Type',         type: 'select', required: true,  options: ['Truck', 'Van', 'Bus', 'Car', 'Motorcycle', 'Other'] },
  { name: 'make',                label: 'Make',                 type: 'text',   required: false, placeholder: 'e.g. Tata' },
  { name: 'model',               label: 'Model',                type: 'text',   required: false, placeholder: 'e.g. Ace' },
  { name: 'year',                label: 'Year',                 type: 'number', required: false, placeholder: 'e.g. 2022', min: 1990, max: 2030 },
  { name: 'fuel_type',           label: 'Fuel Type',            type: 'select', required: false, options: ['Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid'] },
  { name: 'status',              label: 'Status',               type: 'select', required: false, options: ['ACTIVE', 'IDLE', 'STOPPED', 'OFFLINE'] },
  { name: 'fuel_level',          label: 'Fuel Level (%)',       type: 'number', required: false, placeholder: '0–100', min: 0, max: 100 },
];

const DRIVER_FIELDS = [
  { name: 'driver_id',      label: 'Driver ID',         type: 'text',   required: true,  placeholder: 'e.g. DR-001' },
  { name: 'name',           label: 'Full Name',         type: 'text',   required: true,  placeholder: 'e.g. Ravi Kumar' },
  { name: 'email',          label: 'Email',             type: 'email',  required: false, placeholder: 'driver@example.com' },
  { name: 'phone',          label: 'Phone',             type: 'tel',    required: false, placeholder: '+91 98765 43210' },
  { name: 'license_number', label: 'License Number',    type: 'text',   required: false, placeholder: 'e.g. MH0120220012345' },
  { name: 'license_expiry', label: 'License Expiry',    type: 'date',   required: false },
  { name: 'status',         label: 'Status',            type: 'select', required: false, options: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'] },
  { name: 'risk_level',     label: 'Risk Level',        type: 'select', required: false, options: ['LOW', 'MEDIUM', 'HIGH'] },
];

const JOURNEY_FIELDS = [
  { name: 'journey_id',     label: 'Journey ID',          type: 'text',   required: true,  placeholder: 'e.g. JR-001' },
  { name: 'vehicle_id',     label: 'Vehicle (DB ID)',      type: 'number', required: true,  placeholder: 'Numeric vehicle DB ID' },
  { name: 'driver_id',      label: 'Driver (DB ID)',       type: 'number', required: true,  placeholder: 'Numeric driver DB ID' },
  { name: 'start_time',     label: 'Start Time',           type: 'datetime-local', required: true },
  { name: 'end_time',       label: 'End Time',             type: 'datetime-local', required: false },
  { name: 'start_location', label: 'Start Location',       type: 'text',   required: false, placeholder: 'e.g. Mumbai Central' },
  { name: 'end_location',   label: 'End Location',         type: 'text',   required: false, placeholder: 'e.g. Pune Station' },
  { name: 'distance',       label: 'Distance (km)',        type: 'number', required: false, placeholder: '0.0', min: 0 },
  { name: 'duration',       label: 'Duration (min)',       type: 'number', required: false, placeholder: '0', min: 0 },
  { name: 'fuel_consumed',  label: 'Fuel Consumed (L)',    type: 'number', required: false, placeholder: '0.0', min: 0 },
  { name: 'status',         label: 'Status',               type: 'select', required: false, options: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
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
      { label: 'Start Location', key: 'start_location' },
      { label: 'End Location',   key: 'end_location' },
      { label: 'Distance (km)',  key: 'distance' },
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
function FormField({ field, value, onChange, error }) {
  const baseStyle = { background: '#0c0e18', border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.12)'}`, borderRadius: 9, color: '#e9e9f0', display: 'block', fontSize: 13, marginTop: 6, minHeight: 40, padding: '0 12px', width: '100%', transition: 'border-color 0.18s' };
  const focusStyle = { outline: 'none', borderColor: error ? '#ef4444' : '#9a75ff' };

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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: '', msg: '' });
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const cfg = CONFIG[activeTab];

  /* ── Fetch records ───────────────────────────────────────── */
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

  useEffect(() => {
    setRecords([]);
    setNotice({ type: '', msg: '' });
    setFormOpen(false);
    setEditingId(null);
    fetchRecords();
  }, [activeTab, fetchRecords]);

  /* ── Form handlers ───────────────────────────────────────── */
  const openNewForm = () => {
    setFormData({ ...cfg.defaultValues });
    setFormErrors({});
    setEditingId(null);
    setFormOpen(true);
    setNotice({ type: '', msg: '' });
  };

  const openEditForm = (record) => {
    setFormData({ ...record });
    setFormErrors({});
    setEditingId(record.id);
    setFormOpen(true);
    setNotice({ type: '', msg: '' });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormErrors({});
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
      if (f.type === 'number' && val !== '' && val !== undefined) {
        const n = Number(val);
        if (isNaN(n)) errs[f.name] = 'Must be a number.';
        else if (f.min !== undefined && n < f.min) errs[f.name] = `Minimum value is ${f.min}.`;
        else if (f.max !== undefined && n > f.max) errs[f.name] = `Maximum value is ${f.max}.`;
      }
    });
    return errs;
  };

  /* ── Submit ──────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    setSubmitting(true);
    setNotice({ type: '', msg: '' });

    // clean up empty strings → null for optional fields
    const payload = {};
    cfg.fields.forEach((f) => {
      let v = formData[f.name];
      if (v === '' || v === undefined) v = null;
      if (f.type === 'number' && v !== null) v = Number(v);
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
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="de-page">
      {/* Header */}
      <div className="de-header">
        <div>
          <div className="de-eyebrow"><span /> DATA MANAGEMENT</div>
          <h1>Data Entry<span>.</span></h1>
          <p>Add, update, and manage vehicles, drivers, and journeys in the fleet database.</p>
        </div>
        <div className="de-header-actions">
          <button className="de-btn primary" onClick={openNewForm} id="add-record-btn">
            <MdAdd size={18} /> Add {activeTab}
          </button>
          <button className="de-btn subtle" onClick={fetchRecords} disabled={loading} id="refresh-records-btn">
            <MdRefresh size={18} className={loading ? 'spin-icon' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="de-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`de-tab ${activeTab === t.key ? 'is-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
            role="tab"
            aria-selected={activeTab === t.key}
            id={`tab-${t.key}`}
          >
            <t.Icon size={16} />
            {t.label}
            <span className="de-tab-count">{activeTab === t.key ? records.length : ''}</span>
          </button>
        ))}
      </div>

      {/* Notice */}
      {notice.msg && (
        <div className={`de-notice ${notice.type}`} role="alert">
          {notice.type === 'success' ? <MdCheck size={16} /> : <MdWarning size={16} />}
          <span>{notice.msg}</span>
          <button onClick={() => setNotice({ type: '', msg: '' })} aria-label="Dismiss"><MdClose size={15} /></button>
        </div>
      )}

      {/* Records table */}
      <div className="de-table-card">
        {loading ? (
          <div className="de-loading">
            <span className="loading-spinner" style={{ color: '#9c70ff' }} />
            <span>Loading records…</span>
          </div>
        ) : records.length === 0 ? (
          <div className="de-empty">
            <MdEditNote size={36} />
            <b>No {activeTab} records found</b>
            <p>Click "Add {activeTab}" to create your first entry, or import data from the Dashboard.</p>
            <button className="de-btn primary sm" onClick={openNewForm}>
              <MdAdd size={16} /> Add first {activeTab}
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
                    />
                    {formErrors[field.name] && (
                      <span className="de-field-error">{formErrors[field.name]}</span>
                    )}
                  </div>
                ))}
              </div>

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
