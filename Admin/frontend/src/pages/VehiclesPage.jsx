import { useState } from 'react';
import { MdEdit, MdDelete, MdSearch, MdVisibility } from 'react-icons/md';

import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import useAdminList from '../hooks/useAdminList';
import api, { errorMessage } from '../services/api';
import { formatDecimal, formatRelative } from '../utils/format';
import {
  FUEL_TYPES,
  RISK_LEVELS,
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  isValidRegistration,
  isValidVehicleId,
} from '../utils/validation';

const VehiclesPage = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [form, setForm] = useState({});
  const [target, setTarget] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { rows, meta, loading, error, setPage, reload, setError } = useAdminList(
    '/fleet/vehicles',
    { search, status, risk_level: riskLevel },
  );

  const openEdit = (row) => {
    setTarget(row);
    setForm({
      vehicle_id: row.vehicle_id || '',
      registration_number: row.registration_number || '',
      vehicle_type: row.vehicle_type || VEHICLE_TYPES[0],
      make: row.make || '',
      model: row.model || '',
      year: row.year ?? '',
      fuel_type: row.fuel_type || FUEL_TYPES[0],
      status: row.status || 'ACTIVE',
      fuel_level: row.fuel_level ?? '',
      risk_level: row.risk_level || 'LOW',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openDetail = async (row) => {
    setDetail({ loading: true, data: row });
    try {
      const { data } = await api.get(`/fleet/vehicles/${row.id}`);
      setDetail({ loading: false, data });
    } catch (requestError) {
      setDetail(null);
      setError(errorMessage(requestError, 'Unable to load vehicle detail.'));
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!isValidVehicleId(form.vehicle_id)) {
      setFormError('Vehicle ID must use the format VH-001.');
      return;
    }
    if (!isValidRegistration(form.registration_number)) {
      setFormError('Registration must look like MH12AB1234.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        vehicle_id: form.vehicle_id.trim().toUpperCase(),
        registration_number: form.registration_number.trim().toUpperCase(),
        vehicle_type: form.vehicle_type,
        make: form.make?.trim() || null,
        model: form.model?.trim() || null,
        year: form.year === '' ? null : Number(form.year),
        fuel_type: form.fuel_type,
        status: form.status,
        fuel_level: form.fuel_level === '' ? null : Number(form.fuel_level),
        risk_level: form.risk_level,
      };
      await api.put(`/fleet/vehicles/${target.id}`, payload);
      setNotice(`Vehicle ${payload.vehicle_id} updated.`);
      setModalOpen(false);
      reload();
    } catch (requestError) {
      setFormError(errorMessage(requestError, 'Unable to update the vehicle.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/fleet/vehicles/${deleteTarget.id}`);
      setNotice(`Vehicle ${deleteTarget.vehicle_id} and its telemetry were deleted.`);
      setDeleteTarget(null);
      reload();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to delete the vehicle.'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'vehicle_id',
      header: 'Vehicle',
      render: (row) => (
        <>
          <div className="cell-primary mono">{row.vehicle_id}</div>
          <div className="cell-sub mono">{row.registration_number}</div>
        </>
      ),
    },
    {
      key: 'vehicle_type',
      header: 'Type',
      render: (row) => (
        <>
          <div>{row.vehicle_type}</div>
          <div className="cell-sub">{[row.make, row.model].filter(Boolean).join(' ') || '—'}</div>
        </>
      ),
    },
    { key: 'owner', header: 'Owner', render: (row) => <span className="text-sm">{row.owner}</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> },
    { key: 'risk_level', header: 'Risk', render: (row) => <Badge value={row.risk_level} /> },
    {
      key: 'fuel_level',
      header: 'Fuel',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="progress-track">
            <div
              className={`progress-fill ${
                row.fuel_level >= 60 ? 'is-success' : row.fuel_level >= 30 ? 'is-warning' : 'is-danger'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, Number(row.fuel_level) || 0))}%` }}
            />
          </div>
          <span className="text-xs muted nowrap">{formatDecimal(row.fuel_level, 0)}%</span>
        </div>
      ),
    },
    { key: 'journey_count', header: 'Trips', className: 'text-right', render: (row) => row.journey_count ?? 0 },
    { key: 'last_gps_at', header: 'Last GPS', render: (row) => <span className="text-xs muted">{formatRelative(row.last_gps_at)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="cell-actions">
          <button type="button" className="btn btn-sm" onClick={() => openDetail(row)} aria-label={`View ${row.vehicle_id}`}>
            <MdVisibility size={15} />
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openEdit(row)} aria-label={`Edit ${row.vehicle_id}`}>
            <MdEdit size={15} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.vehicle_id}`}
          >
            <MdDelete size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Fleet Vehicles"
        description="Every vehicle across all tenants. Admins can correct registration data, reassign status and override risk levels."
      />

      {notice ? <Alert tone="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert tone="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="admin-card">
        <div className="filter-row mb-2">
          <div className="search-field">
            <MdSearch size={16} />
            <input
              className="input"
              type="search"
              placeholder="Search ID, registration, make or model…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {VEHICLE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="select" value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)} aria-label="Filter by risk">
            <option value="">All risk levels</option>
            {RISK_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No vehicles match the current filters." />
        <Pagination meta={meta} onPageChange={setPage} />
      </section>

      {modalOpen ? (
        <Modal
          title={`Edit ${target?.vehicle_id || 'vehicle'}`}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
              <button type="submit" form="vehicle-form" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : null}
                Save changes
              </button>
            </>
          }
        >
          {formError ? <Alert tone="error">{formError}</Alert> : null}
          <form id="vehicle-form" className="form-grid" onSubmit={handleSave}>
            <div className="field">
              <label htmlFor="v-id">Vehicle ID</label>
              <input id="v-id" className="input" value={form.vehicle_id || ''}
                onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} placeholder="VH-001" required />
            </div>
            <div className="field">
              <label htmlFor="v-reg">Registration</label>
              <input id="v-reg" className="input" value={form.registration_number || ''}
                onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="MH12AB1234" required />
            </div>
            <div className="field">
              <label htmlFor="v-type">Type</label>
              <select id="v-type" className="select" value={form.vehicle_type || ''}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}>
                {VEHICLE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="v-fueltype">Fuel type</label>
              <select id="v-fueltype" className="select" value={form.fuel_type || ''}
                onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>
                {FUEL_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="v-make">Make</label>
              <input id="v-make" className="input" value={form.make || ''}
                onChange={(e) => setForm({ ...form, make: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="v-model">Model</label>
              <input id="v-model" className="input" value={form.model || ''}
                onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="v-year">Year</label>
              <input id="v-year" className="input" type="number" value={form.year ?? ''}
                onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="v-fuel">Fuel level (%)</label>
              <input id="v-fuel" className="input" type="number" min="0" max="100" value={form.fuel_level ?? ''}
                onChange={(e) => setForm({ ...form, fuel_level: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="v-status">Status</label>
              <select id="v-status" className="select" value={form.status || ''}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {VEHICLE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="v-risk">Risk level</label>
              <select id="v-risk" className="select" value={form.risk_level || ''}
                onChange={(e) => setForm({ ...form, risk_level: e.target.value })}>
                {RISK_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </form>
        </Modal>
      ) : null}

      {detail ? (
        <Modal
          title={`${detail.data.vehicle_id} · ${detail.data.registration_number}`}
          onClose={() => setDetail(null)}
          width={700}
        >
          <div className="detail-list">
            <div className="detail-item"><span>Owner</span><strong>{detail.data.owner}</strong></div>
            <div className="detail-item"><span>Status</span><strong><Badge value={detail.data.status} /></strong></div>
            <div className="detail-item"><span>Risk</span><strong><Badge value={detail.data.risk_level} /></strong></div>
            <div className="detail-item"><span>Driver</span><strong>{detail.data.driver_name || 'Unassigned'}</strong></div>
            <div className="detail-item"><span>Type</span><strong>{detail.data.vehicle_type}</strong></div>
            <div className="detail-item"><span>Fuel</span><strong>{detail.data.fuel_type} · {formatDecimal(detail.data.fuel_level, 0)}%</strong></div>
            <div className="detail-item"><span>Journeys</span><strong>{detail.data.journey_count ?? 0}</strong></div>
            <div className="detail-item"><span>GPS records</span><strong>{detail.data.gps_records ?? 0}</strong></div>
          </div>

          <div>
            <h3 className="text-sm muted mb-2" style={{ margin: 0 }}>Recent journeys</h3>
            {detail.data.journeys?.length ? (
              <div className="table-scroll">
                <table className="admin-table" style={{ minWidth: 520 }}>
                  <thead><tr><th>Journey</th><th>Driver</th><th>Distance</th><th>Status</th></tr></thead>
                  <tbody>
                    {detail.data.journeys.map((journey) => (
                      <tr key={journey.id}>
                        <td className="mono">{journey.journey_id}</td>
                        <td>{journey.driver_name}</td>
                        <td>{formatDecimal(journey.distance, 1)} km</td>
                        <td><Badge value={journey.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No journeys recorded for this vehicle.</div>
            )}
          </div>

          <div>
            <h3 className="text-sm muted mb-2" style={{ margin: 0 }}>Risk predictions</h3>
            {detail.data.risk_predictions?.length ? (
              <div className="table-scroll">
                <table className="admin-table" style={{ minWidth: 480 }}>
                  <thead><tr><th>Level</th><th>Probability</th><th>Model</th><th>When</th></tr></thead>
                  <tbody>
                    {detail.data.risk_predictions.map((prediction) => (
                      <tr key={prediction.id}>
                        <td><Badge value={prediction.risk_level} /></td>
                        <td>{formatDecimal(prediction.risk_probability * 100, 1)}%</td>
                        <td className="text-xs">{prediction.model_used || '—'}</td>
                        <td className="text-xs">{formatRelative(prediction.prediction_timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No risk predictions recorded.</div>
            )}
          </div>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete vehicle"
        message={
          deleteTarget
            ? `This removes ${deleteTarget.vehicle_id} along with its journeys, GPS pings, fuel records, behaviour events and risk predictions.`
            : ''
        }
        confirmLabel="Delete vehicle"
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default VehiclesPage;
