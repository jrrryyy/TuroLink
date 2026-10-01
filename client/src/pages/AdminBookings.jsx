import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
  User,
  GraduationCap,
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { profilePictureUrl } from '../services/profile';
import '../styles/admin-modern.css';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/bookings');
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setFeedback({ type: 'error', text: 'Unable to load tutoring bookings audit.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusChange = async (bookingId, status) => {
    try {
      setActionLoadingId(bookingId);
      const res = await api.patch(`/admin/bookings/${bookingId}/status`, { status });
      setFeedback({ type: 'success', text: res.data.message });
      fetchBookings();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Unable to update booking status.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      b.student?.name?.toLowerCase().includes(q) ||
      b.student?.email?.toLowerCase().includes(q) ||
      b.teacher?.name?.toLowerCase().includes(q) ||
      b.teacher?.email?.toLowerCase().includes(q) ||
      b.subject?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout role="admin">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-main)', marginBottom: '6px' }}>
          Platform Tutoring & Booking Audit
        </h1>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>
          Oversight of all scheduled and completed tutoring sessions between students and instructors across TuroLink. ({bookings.length} total sessions)
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
            {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
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

      {/* FILTER & SEARCH BAR */}
      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by student, teacher, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="admin-filter-group">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              className={`admin-filter-chip ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all' ? 'All Sessions' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* BOOKINGS TABLE */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Instructor</th>
              <th>Topic / Rate</th>
              <th>Scheduled Time</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Administrative Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--admin-text-muted)' }}>
                  Loading session records...
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((b) => (
                <tr key={b._id}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar-small">
                        {b.student?.profilePicture ? (
                          <img src={profilePictureUrl(b.student.profilePicture)} alt="" />
                        ) : (
                          (b.student?.name || 'S').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="admin-user-name">{b.student?.name || 'Student'}</div>
                        <div className="admin-user-email">{b.student?.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar-small">
                        {b.teacher?.profilePicture ? (
                          <img src={profilePictureUrl(b.teacher.profilePicture)} alt="" />
                        ) : (
                          (b.teacher?.name || 'T').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="admin-user-name">{b.teacher?.name || 'Instructor'}</div>
                        <div className="admin-user-email">{b.teacher?.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>
                      {b.subject || 'Tutoring Session'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                      {b.hourlyRate ? `₱${b.hourlyRate}/hr` : 'Standard'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-main)' }}>
                      {b.start ? new Date(b.start).toLocaleDateString() : '—'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                      {b.start ? new Date(b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} -{' '}
                      {b.end ? new Date(b.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${
                        b.status === 'confirmed' || b.status === 'completed'
                          ? 'verified'
                          : b.status === 'pending'
                          ? 'unverified'
                          : 'student'
                      }`}
                      style={{
                        background:
                          b.status === 'cancelled'
                            ? 'rgba(239, 68, 68, 0.12)'
                            : undefined,
                        color:
                          b.status === 'cancelled' ? '#ef4444' : undefined,
                      }}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      {b.status !== 'completed' && (
                        <button
                          type="button"
                          className="admin-action-btn verify"
                          disabled={actionLoadingId === b._id}
                          onClick={() => handleStatusChange(b._id, 'completed')}
                        >
                          <CheckCircle2 size={14} /> Complete
                        </button>
                      )}
                      {b.status !== 'cancelled' && (
                        <button
                          type="button"
                          className="admin-action-btn delete"
                          disabled={actionLoadingId === b._id}
                          onClick={() => handleStatusChange(b._id, 'cancelled')}
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--admin-text-muted)' }}>
                  No session bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
