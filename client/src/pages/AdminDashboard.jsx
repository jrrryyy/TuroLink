import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  GraduationCap,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { profilePictureUrl } from '../services/profile';
import '../styles/admin-modern.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError('Unable to load platform analytics. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const metrics = stats?.metrics || {
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
    verifiedUsers: 0,
    totalSubjects: 0,
    totalBookings: 0,
    activeSessions: 0,
    pendingVerifications: 0,
  };

  return (
    <DashboardLayout role="admin">
      {/* ====================================================================
          MODERN HERO BANNER
          ==================================================================== */}
      <section className="admin-hero-card">
        <div className="admin-hero-badge">
          <Sparkles size={14} /> System Administration
        </div>
        <h1 className="admin-hero-title">Platform Operations Center</h1>
        <p className="admin-hero-desc">
          Unified administration hub for TuroLink. Seamlessly monitor live accounts, verify instructor credentials, oversee academic subjects, and interact with the platform from any user perspective.
        </p>

        <div className="admin-hero-actions">
          <button
            type="button"
            className="admin-hero-btn"
            onClick={() => navigate('/admin/users')}
          >
            <Users size={16} /> Manage All Users
          </button>
          <button
            type="button"
            className="admin-hero-btn secondary"
            onClick={() => navigate('/admin/teachers')}
          >
            <CheckCircle2 size={16} /> Instructor Verifications
            {metrics.pendingVerifications > 0 && (
              <span style={{
                background: '#f43f5e',
                color: '#fff',
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '10px',
                fontWeight: 800,
              }}>
                {metrics.pendingVerifications}
              </span>
            )}
          </button>
          <button
            type="button"
            className="admin-hero-btn secondary"
            onClick={() => navigate('/dashboard')}
          >
            <GraduationCap size={16} /> Enter Student View
          </button>
          <button
            type="button"
            className="admin-hero-btn secondary"
            onClick={() => navigate('/teacher/dashboard')}
          >
            <BookOpen size={16} /> Enter Teacher View
          </button>
        </div>
      </section>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '14px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchStats}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ====================================================================
          KPI METRICS GRID
          ==================================================================== */}
      <div className="admin-metrics-grid">
        {/* Total Users */}
        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-label">Total Platform Users</span>
            <div className="admin-metric-icon-wrap icon-forest">
              <Users size={20} />
            </div>
          </div>
          <div className="admin-metric-value">
            {loading ? '...' : metrics.totalUsers}
          </div>
          <div className="admin-metric-subtext">
            <span>{metrics.totalStudents} Students</span>
            <span>·</span>
            <span>{metrics.totalTeachers} Teachers</span>
            <span>·</span>
            <span>{metrics.totalAdmins} Admins</span>
          </div>
        </div>

        {/* Verified Accounts */}
        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-label">Email Verified Accounts</span>
            <div className="admin-metric-icon-wrap icon-emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="admin-metric-value">
            {loading ? '...' : metrics.verifiedUsers}
          </div>
          <div className="admin-metric-subtext">
            <span className="admin-badge-trend up">
              <TrendingUp size={12} />
              {metrics.totalUsers > 0 ? Math.round((metrics.verifiedUsers / metrics.totalUsers) * 100) : 0}%
            </span>
            <span>Account verification rate</span>
          </div>
        </div>

        {/* Subjects & Curriculum */}
        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-label">Active Subjects</span>
            <div className="admin-metric-icon-wrap icon-blue">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="admin-metric-value">
            {loading ? '...' : metrics.totalSubjects}
          </div>
          <div className="admin-metric-subtext">
            <span>Created across verified tutors</span>
          </div>
        </div>

        {/* Tutoring Bookings */}
        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-label">Tutor Bookings</span>
            <div className="admin-metric-icon-wrap icon-amber">
              <CalendarDays size={20} />
            </div>
          </div>
          <div className="admin-metric-value">
            {loading ? '...' : metrics.totalBookings}
          </div>
          <div className="admin-metric-subtext">
            <span>Sessions scheduled & completed</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          TWO-COLUMN DATA PANELS
          ==================================================================== */}
      <div className="admin-grid-2col">
        {/* Recent Registrations */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <Users size={18} style={{ color: 'var(--admin-primary)' }} />
              Recent Registrations
            </div>
            <button
              type="button"
              className="admin-panel-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/admin/users')}
            >
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--admin-text-muted)' }}>
                      Loading recent users...
                    </td>
                  </tr>
                ) : stats?.recentUsers?.length ? (
                  stats.recentUsers.map((u) => (
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
                            <div className="admin-user-name">{u.name}</div>
                            <div className="admin-user-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-badge ${u.role}`}>{u.role}</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${u.emailVerifiedAt ? 'verified' : 'unverified'}`}>
                          {u.emailVerifiedAt ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--admin-text-muted)' }}>
                      No users registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Teacher Verifications & Recent Bookings */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <ShieldCheck size={18} style={{ color: '#10b981' }} />
              Pending Instructor Approvals
            </div>
            <button
              type="button"
              className="admin-panel-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/admin/teachers')}
            >
              Review All <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--admin-text-muted)' }}>
              Loading applications...
            </div>
          ) : stats?.pendingTeachers?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.pendingTeachers.map((tp) => (
                <div
                  key={tp._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--admin-card-border)',
                    background: 'rgba(100, 116, 139, 0.04)',
                  }}
                >
                  <div className="admin-user-cell">
                    <div className="admin-avatar-small">
                      {tp.user?.profilePicture ? (
                        <img src={profilePictureUrl(tp.user.profilePicture)} alt="" />
                      ) : (
                        (tp.user?.name || 'T').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="admin-user-name">{tp.user?.name || 'Instructor'}</div>
                      <div className="admin-user-email">{tp.degreeTitle} · {tp.subjectToTeach}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="admin-action-btn verify"
                    onClick={() => navigate('/admin/teachers')}
                  >
                    Inspect <ExternalLink size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '36px 20px',
              color: 'var(--admin-text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}>
              <CheckCircle2 size={32} style={{ color: '#10b981', opacity: 0.8 }} />
              <div>All instructor applications are reviewed and up to date!</div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
