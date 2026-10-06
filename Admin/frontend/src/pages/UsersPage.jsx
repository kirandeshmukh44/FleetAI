import { useState } from 'react';
import { MdPersonAdd, MdEdit, MdDelete, MdSearch } from 'react-icons/md';

import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import useAdminList from '../hooks/useAdminList';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatNumber } from '../utils/format';
import { USER_ROLES, isValidEmail, isValidName, isValidPassword, isValidUsername } from '../utils/validation';

const EMPTY_FORM = { username: '', full_name: '', email: '', password: '', role: 'user' };

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { rows, meta, loading, error, setPage, reload, setError } = useAdminList('/users/', { search, role });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      username: row.username || '',
      full_name: row.full_name || '',
      email: row.email || '',
      password: '',
      role: row.role || 'user',
    });
    setFormError('');
    setModalOpen(true);
  };

  const validate = () => {
    if (!isValidUsername(form.username)) return 'Username must start with a letter and be 3-30 characters.';
    if (!isValidEmail(form.email)) return 'Enter a valid email address.';
    if (form.full_name && !isValidName(form.full_name)) return 'Enter a valid full name.';
    if (!isValidPassword(form.password)) return 'Password must be between 6 and 128 characters.';
    return '';
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        username: form.username.trim(),
        full_name: form.full_name.trim() || null,
        email: form.email.trim(),
        role: form.role,
      };
      if (form.password) payload.password = form.password;

      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
        setNotice(`User ${payload.username} updated.`);
      } else {
        await api.post('/users/', payload);
        setNotice(`User ${payload.username} created.`);
      }
      setModalOpen(false);
      reload();
    } catch (requestError) {
      setFormError(errorMessage(requestError, 'Unable to save the user.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setNotice(`User ${deleteTarget.username} and all owned records were deleted.`);
      setDeleteTarget(null);
      reload();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to delete the user.'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'username',
      header: 'User',
      render: (row) => (
        <>
          <div className="cell-primary">{row.full_name || row.username}</div>
          <div className="cell-sub">@{row.username}</div>
        </>
      ),
    },
    { key: 'email', header: 'Email', render: (row) => <span className="truncate">{row.email}</span> },
    { key: 'role', header: 'Role', render: (row) => <Badge value={row.role} /> },
    {
      key: 'resources',
      header: 'Resources',
      render: (row) => (
        <span className="text-xs muted nowrap">
          {formatNumber(row.resource_counts?.vehicles)} vehicles ·{' '}
          {formatNumber(row.resource_counts?.drivers)} drivers ·{' '}
          {formatNumber(row.resource_counts?.journeys)} journeys
        </span>
      ),
    },
    { key: 'created_at', header: 'Joined', render: (row) => <span className="text-xs">{formatDate(row.created_at, false)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="cell-actions">
          <button type="button" className="btn btn-sm" onClick={() => openEdit(row)} aria-label={`Edit ${row.username}`}>
            <MdEdit size={15} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => setDeleteTarget(row)}
            disabled={row.id === currentUser?.id}
            title={row.id === currentUser?.id ? 'You cannot delete your own account' : 'Delete user'}
            aria-label={`Delete ${row.username}`}
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
        title="User Governance"
        description="Create accounts, adjust roles and remove users. Deleting a user also removes the vehicles, drivers and journeys they own."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <MdPersonAdd size={16} />
            New user
          </button>
        }
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
              placeholder="Search username, email or name…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="select" value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter by role">
            <option value="">All roles</option>
            {USER_ROLES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="No users match the current filters." />
        <Pagination meta={meta} onPageChange={setPage} />
      </section>

      {modalOpen ? (
        <Modal
          title={editingId ? 'Edit user' : 'Create user'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setModalOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" form="user-form" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : null}
                {editingId ? 'Save changes' : 'Create user'}
              </button>
            </>
          }
        >
          {formError ? <Alert tone="error">{formError}</Alert> : null}
          <form id="user-form" className="form-grid" onSubmit={handleSave}>
            <div className="field">
              <label htmlFor="user-username">Username</label>
              <input
                id="user-username"
                className="input"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                placeholder="ops.manager"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="user-fullname">Full name</label>
              <input
                id="user-fullname"
                className="input"
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                placeholder="Ops Manager"
              />
            </div>
            <div className="field">
              <label htmlFor="user-email">Email</label>
              <input
                id="user-email"
                className="input"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="ops@fleetai.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="user-role">Role</label>
              <select
                id="user-role"
                className="select"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                {USER_ROLES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="field span-2">
              <label htmlFor="user-password">Password {editingId ? '(leave blank to keep current)' : ''}</label>
              <input
                id="user-password"
                className="input"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Minimum 6 characters"
                required={!editingId}
              />
            </div>
          </form>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user"
        message={
          deleteTarget
            ? `This permanently removes ${deleteTarget.username} along with every vehicle, driver and journey they own. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete permanently"
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default UsersPage;
