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
import { formatDate, formatDecimal, formatRelative } from '../utils/format';
import { DRIVER_STATUSES, RISK_LEVELS, isValidDriverId, isValidName } from '../utils/validation';

const DriversPage = () => {
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

  const { rows, meta, loading, error, setPage, reload, setError } = useAdminList('/fleet/drivers', {
    search,
    status,
    risk_level: riskLevel,
  });

  const openEdit = (row) => {
    setTarget(row);
    setForm({
      driver_id: row.driver_id || '',
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      status: row.status || 'ACTIVE',
      risk_level: row.risk_level || 'LOW',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openDetail = async (row) => {
    setDetail({ loading: true, data: row });
    try {
      const { data } = await api.get(`/fleet/drivers/${row.id}`);
      setDetail({ loading: false, data });
    } catch (requestError) {
      setDetail(null);
      setError(errorMessage(requestError, 'Unable to load driver detail.'));
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!isValidDriverId(form.driver_id)) {
      setFormError('Driver ID must use the format DR-001.');
      return;
    }
    if (!isValidName(form.name)) {
      setFormError('Enter a valid driver name.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await api.put(`/fleet/drivers/${target.id}`, {
        driver_id: form.driver_id.trim().toUpperCase(),
        name: form.name.trim(),
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        status: form.status,
        risk_level: form.risk_level,
      });
      setNotice(`Driver ${form.driver_id.trim().toUpperCase()} updated.`);
      setModalOpen(false);
      reload();
    } catch (requestError) {
      setFormError(errorMessage(requestError, 'Unable to update the driver.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/fleet/drivers/${deleteTarget.id}`);
      setNotice(`Driver ${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      reload();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to delete the driver.'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };


  const columns = [
    {
      key: 'name',
      header: 'Driver',
      render: (row) => (
        <>
          <div className="cell-primary">{row.name}</div>
          <div className="cell-sub mono">{row.driver_id}</div>
        </>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => (
        <>
          <div className="text-sm truncate">{row.email || '—'}</div>
          <div className="cell-sub">{row.phone || 'No phone'}</div>
        </>
      ),
    },
    { key: 'owner', header: 'Owner', render: (row) => <span className="text-sm">{row.owner}</span> },
    { key: 'vehicle_code', header: 'Vehicle', render: (row) => <span className="mono text-sm">{row.vehicle_code || '—'}</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> },
    { key: 'risk_level', header: 'Risk', render: (row) => <Badge value={row.risk_level} /> },
    {
      key: 'risk_score',
      header: 'Score',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="progress-track">
            <div
              className={`progress-fill ${
                row.risk_score >= 60 ? 'is-danger' : row.risk_score >= 30 ? 'is-warning' : 'is-success'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, Number(row.risk_score) || 0))}%` }}
            />
          </div>
          <span className="text-xs muted nowrap">{formatDecimal(row.risk_score, 1)}</span>
        </div>
      ),
    },
    { key: 'license_expiry', header: 'Licence', render: (row) => <span className="text-xs">{formatDate(row.license_expiry, false)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="cell-actions">
          <button type="button" className="btn btn-sm" onClick={() => openDetail(row)} aria-label={`View ${row.name}`}>
            <MdVisibility size={15} />
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openEdit(row)} aria-label={`Edit ${row.name}`}>
            <MdEdit size={15} />
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(row)} aria-label={`Delete ${row.name}`}>
            <MdDelete size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Driver Records"
        description="Every driver across all tenants, with risk scoring, licence validity and vehicle assignments."
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
              placeholder="Search name, ID, email or licence…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {DRIVER_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="select" value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)} aria-label="Filter by risk">
            <option value="">All risk levels</option>
            {RISK_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No drivers match the current filters." />
        <Pagination meta={meta} onPageChange={setPage} />
      </section>

      {modalOpen ? (
        <Modal
          title={`Edit ${target?.name || 'driver'}`}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
              <button type="submit" form="driver-form" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : null}
                Save changes
              </button>
            </>
          }
        >
          {formError ? <Alert tone="error">{formError}</Alert> : null}
          <form id="driver-form" className="form-grid" onSubmit={handleSave}>
            <div className="field">
              <label htmlFor="d-id">Driver ID</label>
              <input id="d-id" className="input" value={form.driver_id || ''}
                onChange={(e) => setForm({ ...form, driver_id: e.target.value })} placeholder="DR-001" required />
            </div>
            <div className="field">
              <label htmlFor="d-name">Full name</label>
              <input id="d-name" className="input" value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="d-email">Email</label>
              <input id="d-email" className="input" type="email" value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="d-phone">Phone</label>
              <input id="d-phone" className="input" value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
            </div>
            <div className="field">
              <label htmlFor="d-status">Status</label>
              <select id="d-status" className="select" value={form.status || ''}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {DRIVER_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="d-risk">Risk level</label>
              <select id="d-risk" className="select" value={form.risk_level || ''}
                onChange={(e) => setForm({ ...form, risk_level: e.target.value })}>
                {RISK_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </form>
        </Modal>
      ) : null}

      {detail ? (
        <Modal title={`${detail.data.name} · ${detail.data.driver_id}`} onClose={() => setDetail(null)} width={700}>
          <div className="detail-list">
            <div className="detail-item"><span>Owner</span><strong>{detail.data.owner}</strong></div>
            <div className="detail-item"><span>Status</span><strong><Badge value={detail.data.status} /></strong></div>
            <div className="detail-item"><span>Risk</span><strong><Badge value={detail.data.risk_level} /></strong></div>
            <div className="detail-item"><span>Vehicle</span><strong>{detail.data.vehicle_code || 'Unassigned'}</strong></div>
            <div className="detail-item"><span>Risk score</span><strong>{formatDecimal(detail.data.risk_score, 1)}</strong></div>
            <div className="detail-item"><span>Journeys</span><strong>{detail.data.total_journeys ?? 0}</strong></div>
            <div className="detail-item"><span>Avg speed</span><strong>{formatDecimal(detail.data.average_speed, 1)} km/h</strong></div>
            <div className="detail-item"><span>Licence expiry</span><strong>{formatDate(detail.data.license_expiry, false)}</strong></div>
          </div>

          <div>
            <h3 className="text-sm muted mb-2" style={{ margin: 0 }}>Recent risk predictions</h3>
            {detail.data.predictions?.length ? (
              <div className="table-scroll">
                <table className="admin-table" style={{ minWidth: 480 }}>
                  <thead><tr><th>Level</th><th>Probability</th><th>Model</th><th>When</th></tr></thead>
                  <tbody>
                    {detail.data.predictions.map((prediction) => (
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

          <div>
            <h3 className="text-sm muted mb-2" style={{ margin: 0 }}>Recent behaviour events</h3>
            {detail.data.behaviors?.length ? (
              <div className="table-scroll">
                <table className="admin-table" style={{ minWidth: 480 }}>
                  <thead><tr><th>Event</th><th>Speed</th><th>Braking</th><th>When</th></tr></thead>
                  <tbody>
                    {detail.data.behaviors.map((event) => (
                      <tr key={event.id}>
                        <td><Badge value={event.event_type} tone={event.event_type === 'NORMAL' ? 'low' : 'warning'} /></td>
                        <td>{formatDecimal(event.speed, 1)} km/h</td>
                        <td>{formatDecimal(event.braking, 2)}</td>
                        <td className="text-xs">{formatRelative(event.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No behaviour events recorded.</div>
            )}
          </div>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete driver"
        message={
          deleteTarget
            ? `This removes ${deleteTarget.name} along with their journeys, fuel records, behaviour events and risk predictions.`
            : ''
        }
        confirmLabel="Delete driver"
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default DriversPage;
