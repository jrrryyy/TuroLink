import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowRight,
  UserX,
  UserCheck,
  Check,
  X,
  Lock,
  ChevronLeft,
  ChevronRight,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { profilePictureUrl } from '../services/profile';
import '../styles/admin-reports.css';

const CATEGORY_LABELS = {
  fraud: 'Fraud / Non-Payment',
  fake_profile: 'Fake Profile / Not a Real Teacher',
  harassment: 'Harassment / Abusive Behavior',
  scam: 'Scam / Phishing',
  inappropriate_content: 'Inappropriate Content',
  other: 'Other Violation',
};

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Ban dialog state
  const [banModalReport, setBanModalReport] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        status: statusFilter,
        category: categoryFilter,
        search: search.trim(),
      };
      const [reportsRes, statsRes] = await Promise.all([
        api.get('/admin/reports', { params }),
        api.get('/admin/reports/stats'),
      ]);
      setReports(reportsRes.data.reports || []);
      setTotalPages(reportsRes.data.totalPages || 1);
      setTotalCount(reportsRes.data.total || 0);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setFeedback({ type: 'error', text: 'Unable to retrieve user reports.' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Handle lifetime ban
  const handleConfirmBan = async () => {
    if (!banModalReport) return;
    const reportedUser = banModalReport.reportedUser;
    if (!reportedUser?._id) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/users/${reportedUser._id}/ban`, {
        reason: banReason.trim() || `Banned following report: ${CATEGORY_LABELS[banModalReport.category] || banModalReport.category}`,
        reportId: banModalReport._id,
      });
      setFeedback({
        type: 'success',
        text: `${reportedUser.name} has been banned for life and their sessions were terminated.`,
      });
      setBanModalReport(null);
      setBanReason('');
      fetchReports();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to ban user.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle unban
  const handleUnbanUser = async (userId, userName) => {
    try {
      setActionLoading(true);
      await api.post(`/admin/users/${userId}/unban`);
      setFeedback({
        type: 'success',
        text: `${userName}'s lifetime ban has been lifted.`,
      });
      fetchReports();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Unable to lift ban.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle status update
  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/reports/${reportId}`, { status: newStatus });
      setFeedback({ type: 'success', text: `Report marked as ${newStatus}.` });
      fetchReports();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to update report status.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="admin-reports-page">
        {/* Page Intro Header */}
        <header className="admin-reports-header">
          <h1>User Complaints & Moderation Center</h1>
          <p>
            Review misconduct reports, investigate fraud or credentials issues, and ban
            violators for life. ({totalCount} total complaints)
          </p>
        </header>

        {feedback && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              fontSize: '0.88rem',
              fontWeight: 600,
              background: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5',
              border: `1px solid ${feedback.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
              color: feedback.type === 'error' ? '#b91c1c' : '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Platform Report Metrics */}
        <div className="admin-reports-metrics">
          <div className="admin-report-stat-card">
            <div className="admin-report-stat-icon pending">
              <Clock size={22} />
            </div>
            <div className="admin-report-stat-info">
              <strong>{stats?.pending || 0}</strong>
              <span>Pending Review</span>
            </div>
          </div>

          <div className="admin-report-stat-card">
            <div className="admin-report-stat-icon investigating">
              <ShieldAlert size={22} />
            </div>
            <div className="admin-report-stat-info">
              <strong>{stats?.investigating || 0}</strong>
              <span>Under Investigation</span>
            </div>
          </div>

          <div className="admin-report-stat-card">
            <div className="admin-report-stat-icon resolved">
              <CheckCircle2 size={22} />
            </div>
            <div className="admin-report-stat-info">
              <strong>{stats?.resolved || 0}</strong>
              <span>Resolved</span>
            </div>
          </div>

          <div className="admin-report-stat-card">
            <div className="admin-report-stat-icon banned">
              <UserX size={22} />
            </div>
            <div className="admin-report-stat-info">
              <strong>{stats?.bannedCount || 0}</strong>
              <span>Banned for Life</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="admin-reports-controls">
          <div className="admin-reports-tabs">
            {[
              { id: 'all', label: 'All Complaints', count: stats?.total || 0 },
              { id: 'pending', label: 'Pending', count: stats?.pending || 0 },
              { id: 'investigating', label: 'Investigating', count: stats?.investigating || 0 },
              { id: 'resolved', label: 'Resolved', count: stats?.resolved || 0 },
              { id: 'dismissed', label: 'Dismissed', count: stats?.dismissed || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-reports-tab-btn ${statusFilter === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
              >
                <span>{tab.label}</span>
                <span className="admin-reports-tab-badge">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="admin-reports-filter-row">
            <div className="admin-reports-search-wrap">
              <Search size={16} className="admin-reports-search-icon" />
              <input
                type="search"
                className="admin-reports-search-input"
                placeholder="Search reporter, accused user, or description…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              className="admin-reports-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Categories</option>
              <option value="fraud">Fraud / Non-Payment</option>
              <option value="fake_profile">Fake Profile / Not Real Teacher</option>
              <option value="harassment">Harassment / Abusive Behavior</option>
              <option value="scam">Scam / Phishing</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="other">Other Violation</option>
            </select>
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p>Loading complaints roster…</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="admin-reports-empty">
            <div className="admin-reports-empty-icon">
              <CheckCircle2 size={30} />
            </div>
            <strong>No complaints found</strong>
            <p>There are no filed complaints matching your active filters.</p>
          </div>
        ) : (
          <div className="admin-reports-list">
            {reports.map((report) => {
              const reporter = report.reporter || {};
              const reported = report.reportedUser || {};
              const isBanned = Boolean(reported.isBanned);

              return (
                <div
                  key={report._id}
                  className={`admin-report-card ${isBanned ? 'banned-user' : ''}`}
                >
                  <div className="admin-report-card-top">
                    {/* Reporter & Accused Parties */}
                    <div className="admin-report-parties">
                      <div className="admin-report-user-block">
                        <div className="admin-report-user-avatar">
                          {reporter.profilePicture ? (
                            <img src={profilePictureUrl(reporter.profilePicture)} alt="" />
                          ) : (
                            reporter.name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div className="admin-report-user-meta">
                          <strong>
                            {reporter.name || 'Unknown User'}
                            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', padding: '1px 6px', background: '#e2e8f0', borderRadius: '4px' }}>
                              {reporter.role || 'user'}
                            </span>
                          </strong>
                          <span>{reporter.email} (Reporter)</span>
                        </div>
                      </div>

                      <div className="admin-report-arrow-icon">
                        <ArrowRight size={16} />
                      </div>

                      <div className="admin-report-user-block">
                        <div className="admin-report-user-avatar" style={{ background: '#b91c1c' }}>
                          {reported.profilePicture ? (
                            <img src={profilePictureUrl(reported.profilePicture)} alt="" />
                          ) : (
                            reported.name?.charAt(0) || 'A'
                          )}
                        </div>
                        <div className="admin-report-user-meta">
                          <strong>
                            {reported.name || 'Accused User'}
                            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', padding: '1px 6px', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px' }}>
                              {reported.role || 'user'}
                            </span>
                            {isBanned && (
                              <span className="admin-banned-badge">
                                <Lock size={10} /> Banned for Life
                              </span>
                            )}
                          </strong>
                          <span>{reported.email} (Accused)</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="admin-report-tags">
                      <span className={`admin-report-category-pill ${report.category}`}>
                        {CATEGORY_LABELS[report.category] || report.category}
                      </span>
                      <span className={`admin-report-status-pill ${report.status}`}>
                        {report.status}
                      </span>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="admin-report-desc-box">
                    <strong>Complaint Details & Evidence:</strong>
                    {report.description}
                  </div>

                  {/* Admin notes if present */}
                  {report.adminNotes && (
                    <div className="admin-report-notes-box">
                      <strong>Admin Notes: </strong>
                      {report.adminNotes}
                    </div>
                  )}

                  {/* Actions & Footer */}
                  <div className="admin-report-card-footer">
                    <div className="admin-report-timestamp">
                      Report filed on{' '}
                      {new Date(report.createdAt).toLocaleDateString('en-PH', {
                        timeZone: 'Asia/Manila',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {report.resolvedAt && (
                        <> · Resolved on {new Date(report.resolvedAt).toLocaleDateString()}</>
                      )}
                    </div>

                    <div className="admin-report-actions-row">
                      {/* Lifetime Ban / Unban Button */}
                      {isBanned ? (
                        <button
                          type="button"
                          className="admin-action-btn unban"
                          onClick={() => handleUnbanUser(reported._id, reported.name)}
                          disabled={actionLoading}
                        >
                          <UserCheck size={14} /> Unban User
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-action-btn ban"
                          onClick={() => {
                            setBanModalReport(report);
                            setBanReason(
                              `Misconduct report filed for ${CATEGORY_LABELS[report.category] || report.category}: "${report.description.slice(0, 100)}..."`
                            );
                          }}
                          disabled={actionLoading}
                        >
                          <UserX size={14} /> Ban User for Life
                        </button>
                      )}

                      {/* Status Buttons */}
                      {report.status === 'pending' && (
                        <button
                          type="button"
                          className="admin-action-btn"
                          style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}
                          onClick={() => handleUpdateStatus(report._id, 'investigating')}
                          disabled={actionLoading}
                        >
                          Mark Investigating
                        </button>
                      )}

                      {report.status !== 'resolved' && (
                        <button
                          type="button"
                          className="admin-action-btn resolve"
                          onClick={() => handleUpdateStatus(report._id, 'resolved')}
                          disabled={actionLoading}
                        >
                          <Check size={14} /> Mark Resolved
                        </button>
                      )}

                      {report.status !== 'dismissed' && (
                        <button
                          type="button"
                          className="admin-action-btn dismiss"
                          onClick={() => handleUpdateStatus(report._id, 'dismissed')}
                          disabled={actionLoading}
                        >
                          <X size={14} /> Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="admin-reports-tab-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: '#64748b' }}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="admin-reports-tab-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Lifetime Ban Confirmation Dialog ─────────────────────────────── */}
      {banModalReport && (
        <div
          className="admin-ban-dialog-overlay"
          onClick={() => setBanModalReport(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="admin-ban-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-ban-dialog-header">
              <div className="admin-ban-dialog-icon">
                <UserX size={24} />
              </div>
              <div>
                <h3>Permanently Ban User for Life?</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  Target: {banModalReport.reportedUser?.name} ({banModalReport.reportedUser?.email})
                </p>
              </div>
            </div>

            <p>
              This will <strong>permanently revoke all platform access</strong>. All active
              sessions will be terminated immediately, forcing an instant logout across all
              devices.
            </p>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Reason for Permanent Suspension:
              </label>
              <textarea
                className="admin-ban-input"
                rows={3}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason displayed on lockout..."
              />
            </div>

            <div className="admin-ban-dialog-actions">
              <button
                type="button"
                className="report-btn-cancel"
                onClick={() => setBanModalReport(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="report-btn-submit"
                onClick={handleConfirmBan}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Banning…
                  </>
                ) : (
                  <>
                    <UserX size={15} /> Confirm Lifetime Ban
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
