import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Shield,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { profilePictureUrl } from '../services/profile';
import { useAuth } from '../context/AuthContext';
import '../styles/admin-modern.css';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [feedback, setFeedback] = useState(null);

  // Modals state
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [newRole, setNewRole] = useState('student');
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        search: search.trim(),
        role: roleFilter,
        status: statusFilter,
      };
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.users);
      setTotalPages(res.data.totalPages);
      setTotalCount(res.data.total);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setFeedback({ type: 'error', text: 'Unable to load user roster.' });
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle role change
  const handleRoleChangeSubmit = async () => {
    if (!roleModalUser) return;
    try {
      setActionLoading(true);
      await api.patch(`/admin/users/${roleModalUser._id}/role`, { role: newRole });
      setFeedback({ type: 'success', text: `Updated ${roleModalUser.name}'s role to ${newRole}.` });
      setRoleModalUser(null);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update user role.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle verification toggle
  const handleToggleVerify = async (u) => {
    try {
      const res = await api.patch(`/admin/users/${u._id}/verify`);
      setFeedback({ type: 'success', text: res.data.message });
      fetchUsers();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to update email verification status.' });
    }
  };

  // Handle user deletion
  const handleDeleteSubmit = async () => {
    if (!deleteModalUser) return;
    try {
      setActionLoading(true);
      await api.delete(`/admin/users/${deleteModalUser._id}`);
      setFeedback({ type: 'success', text: `Deleted user ${deleteModalUser.name}.` });
      setDeleteModalUser(null);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to delete user.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-main)', marginBottom: '6px' }}>
          User Directory & Access Control
        </h1>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>
          Inspect user accounts, reassign permissions, approve verifications, and manage platform roles. ({totalCount} total users)
        </p>
      </div>

      {feedback && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
          color: feedback.type === 'error' ? '#ef4444' : '#10b981',
          border: `1px solid ${feedback.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
            {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* FILTER & SEARCH CONTROLS */}
      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or mobile number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="admin-filter-group">
          {['all', 'student', 'teacher', 'admin'].map((r) => (
            <button
              key={r}
              type="button"
              className={`admin-filter-chip ${roleFilter === r ? 'active' : ''}`}
              onClick={() => {
                setRoleFilter(r);
                setPage(1);
              }}
            >
              {r === 'all' ? 'All Roles' : `${r.charAt(0).toUpperCase() + r.slice(1)}s`}
            </button>
          ))}

          <span style={{ color: 'var(--admin-text-muted)', margin: '0 4px' }}>|</span>

          {['all', 'verified', 'unverified'].map((st) => (
            <button
              key={st}
              type="button"
              className={`admin-filter-chip ${statusFilter === st ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              {st === 'all' ? 'All Status' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Email Verified</th>
              <th>Joined Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--admin-text-muted)' }}>
                  Loading users...
                </td>
              </tr>
            ) : users.length ? (
              users.map((u) => {
                const isSelf = currentUser?._id === u._id;
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar-small">
                          {u.profilePicture ? (
                            <img src={profilePictureUrl(u.profilePicture)} alt="" />
                          ) : (
                            (u.name || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="admin-user-name">
                            {u.name} {isSelf && <span style={{ fontSize: '0.72rem', color: 'var(--admin-primary)', fontWeight: 700 }}>(You)</span>}
                          </div>
                          <div className="admin-user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                        {u.phone || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${u.role}`}>{u.role}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleVerify(u)}
                        title="Click to toggle email verification"
                        className={`admin-action-btn ${u.emailVerifiedAt ? 'verify' : 'edit'}`}
                        style={{ cursor: 'pointer' }}
                      >
                        {u.emailVerifiedAt ? (
                          <>
                            <CheckCircle size={14} /> Verified
                          </>
                        ) : (
                          <>
                            <XCircle size={14} /> Unverified
                          </>
                        )}
                      </button>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="admin-action-btn edit"
                          onClick={() => {
                            setRoleModalUser(u);
                            setNewRole(u.role);
                          }}
                        >
                          <Shield size={14} /> Edit Role
                        </button>

                        {!isSelf && (
                          <button
                            type="button"
                            className="admin-action-btn delete"
                            onClick={() => setDeleteModalUser(u)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--admin-text-muted)' }}>
                  No users matched your search filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid var(--admin-card-border)',
              background: 'var(--admin-card-bg)',
              color: 'var(--admin-text-main)',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.5 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid var(--admin-card-border)',
              background: 'var(--admin-card-bg)',
              color: 'var(--admin-text-main)',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.5 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {roleModalUser && (
        <div className="admin-modal-backdrop" onClick={() => setRoleModalUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-title">Modify User Permissions</div>
            <div className="admin-modal-subtitle">
              Select an access tier for <strong>{roleModalUser.name}</strong> ({roleModalUser.email}).
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Platform Role</label>
              <select
                className="admin-select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="student">Student (Courses, Tutors, Bookings, Classwork)</option>
                <option value="teacher">Teacher (Instructor Dashboard, Schedules, Materials)</option>
                <option value="admin">Administrator (Universal dual-role + Admin Hub)</option>
              </select>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setRoleModalUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={handleRoleChangeSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Save Role Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalUser && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteModalUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-title" style={{ color: 'var(--admin-danger)' }}>
              Confirm Account Deletion
            </div>
            <div className="admin-modal-subtitle">
              Are you sure you want to permanently delete <strong>{deleteModalUser.name}</strong> ({deleteModalUser.email})? This action removes all active sessions and linked teacher records.
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setDeleteModalUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-action-btn delete"
                style={{ padding: '9px 18px', fontSize: '0.88rem' }}
                onClick={handleDeleteSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
