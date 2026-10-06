import { useState } from 'react';
import { MdSearch } from 'react-icons/md';

import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Alert from '../components/Alert';
import Pagination from '../components/Pagination';
import useAdminList from '../hooks/useAdminList';
import { formatDate } from '../utils/format';

const ACTION_TONES = {
  created: 'success',
  updated: 'info',
  deleted: 'danger',
  resolved: 'success',
  changed: 'info',
};

const AuditPage = () => {
  const [action, setAction] = useState('');

  const { rows, meta, loading, error, setPage, setError } = useAdminList('/users/audit-logs', { action });

  const columns = [
    {
      key: 'created_at',
      header: 'When',
      render: (row) => (
        <>
          <div className="text-sm">{formatDate(row.created_at)}</div>
          <div className="cell-sub">{row.ip_address || 'local'}</div>
        </>
      ),
    },
    { key: 'actor_username', header: 'Actor', render: (row) => <span className="cell-primary">{row.actor_username}</span> },
    {
      key: 'action',
      header: 'Action',
      render: (row) => {
        const [entity = 'action'] = String(row.action).split('.');
        return (
          <span className={`badge badge-${ACTION_TONES[entity] || 'neutral'}`}>
            {row.action}
          </span>
        );
      },
    },
    {
      key: 'entity',
      header: 'Target',
      render: (row) => (
        <span className="text-sm">
          {row.entity_type || '—'}
          {row.entity_id ? <span className="mono muted"> #{row.entity_id}</span> : null}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (row) => (
        <span className="text-xs muted truncate" style={{ maxWidth: 320, display: 'block' }}>
          {row.details ? JSON.stringify(row.details) : '—'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Immutable record of every privileged action taken in this console — account changes, record overrides and configuration updates."
      />

      {error ? <Alert tone="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="admin-card">
        <div className="filter-row mb-2">
          <div className="search-field">
            <MdSearch size={16} />
            <input className="input" type="search" placeholder="Filter by action prefix…" disabled />
          </div>
          <select className="select" value={action} onChange={(event) => setAction(event.target.value)} aria-label="Filter by action">
            <option value="">All actions</option>
            <option value="user">user.*</option>
            <option value="vehicle">vehicle.*</option>
            <option value="driver">driver.*</option>
            <option value="setting">setting.*</option>
            <option value="notification">notification.*</option>
            <option value="auth">auth.*</option>
          </select>
        </div>

        <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No audit entries recorded yet." />
        <Pagination meta={meta} onPageChange={setPage} />
      </section>
    </>
  );
};

export default AuditPage;
