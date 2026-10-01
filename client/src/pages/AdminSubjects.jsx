import { useEffect, useState } from 'react';
import {
  BookOpen,
  Search,
  Trash2,
  Users,
  FileText,
  Bell,
  AlertCircle,
  CheckCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { profilePictureUrl } from '../services/profile';
import '../styles/admin-modern.css';

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [deleteModalSubject, setDeleteModalSubject] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/subjects');
      setSubjects(res.data.subjects || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
      setFeedback({ type: 'error', text: 'Unable to load platform subjects catalog.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleDelete = async () => {
    if (!deleteModalSubject) return;
    try {
      setActionLoading(true);
      await api.delete(`/admin/subjects/${deleteModalSubject._id}`);
      setFeedback({ type: 'success', text: `Subject "${deleteModalSubject.title}" deleted.` });
      setDeleteModalSubject(null);
      fetchSubjects();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to delete subject.' });
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = subjects.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.title?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q) ||
      s.teacher?.name?.toLowerCase().includes(q) ||
      s.teacher?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout role="admin">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-main)', marginBottom: '6px' }}>
          Platform Academic Catalog
        </h1>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>
          Inspect all subjects, courses, and classwork hosted by instructors across TuroLink. ({subjects.length} active subjects)
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

      {/* SEARCH INPUT */}
      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by subject title, code, or instructor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* SUBJECTS TABLE */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Subject / Code</th>
              <th>Instructor</th>
              <th>Enrollment</th>
              <th>Curriculum Materials</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--admin-text-muted)' }}>
                  Loading subjects...
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((s) => (
                <tr key={s._id}>
                  <td>
                    <div>
                      <div className="admin-user-name" style={{ fontSize: '0.95rem' }}>{s.title}</div>
                      <div className="admin-user-email" style={{ fontWeight: 600, color: 'var(--admin-primary)' }}>
                        {s.code} · Grade {s.gradeLevel || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar-small">
                        {s.teacher?.profilePicture ? (
                          <img src={profilePictureUrl(s.teacher.profilePicture)} alt="" />
                        ) : (
                          (s.teacher?.name || 'T').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="admin-user-name">{s.teacher?.name || 'Assigned Instructor'}</div>
                        <div className="admin-user-email">{s.teacher?.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Users size={15} style={{ color: 'var(--admin-text-muted)' }} />
                      {s.studentCount} Students
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                      <span>{s.materialCount} Materials</span>
                      <span>·</span>
                      <span>{s.announcementCount} Announcements</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="admin-action-btn delete"
                      title="Remove subject from platform"
                      onClick={() => setDeleteModalSubject(s)}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--admin-text-muted)' }}>
                  No subjects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DELETE MODAL */}
      {deleteModalSubject && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteModalSubject(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-title" style={{ color: 'var(--admin-danger)' }}>
              Confirm Subject Removal
            </div>
            <div className="admin-modal-subtitle">
              Are you sure you want to permanently remove <strong>"{deleteModalSubject.title}"</strong> ({deleteModalSubject.code})? All associated announcements, materials, and student enrollments will be wiped.
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setDeleteModalSubject(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-action-btn delete"
                style={{ padding: '9px 18px', fontSize: '0.88rem' }}
                onClick={handleDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete Subject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
