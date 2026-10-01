import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Award,
  Clock,
  Check,
  X,
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { profilePictureUrl } from '../services/profile';
import '../styles/admin-modern.css';

export default function AdminTeacherVerification() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'verified'
  const [feedback, setFeedback] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/teachers', { params: { status: filter } });
      setProfiles(res.data.profiles || []);
    } catch (err) {
      console.error('Failed to load teacher profiles:', err);
      setFeedback({ type: 'error', text: 'Unable to load teacher verification queue.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [filter]);

  const handleVerify = async (profileId, isVerified) => {
    try {
      setActionLoadingId(profileId);
      const res = await api.patch(`/admin/teachers/${profileId}/verify`, { isVerified });
      setFeedback({ type: 'success', text: res.data.message });
      fetchProfiles();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Unable to update verification status.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-main)', marginBottom: '6px' }}>
          Instructor Credential Verifications
        </h1>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>
          Audit teacher applications, evaluate academic credentials, and approve verified instructors for tutoring and subject hosting.
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

      {/* FILTER BUTTONS */}
      <div className="admin-filter-bar">
        <div className="admin-filter-group">
          {[
            { id: 'all', label: 'All Applications' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'verified', label: 'Approved & Verified' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-filter-chip ${filter === item.id ? 'active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* INSTRUCTOR APPLICATIONS GRID */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--admin-text-muted)' }}>
          Loading instructor verification records...
        </div>
      ) : profiles.length ? (
        <div className="admin-card-grid">
          {profiles.map((p) => {
            const isPending = !p.isVerified;
            const docUrl = p.verificationDocument
              ? (p.verificationDocument.startsWith('http') ? p.verificationDocument : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${p.verificationDocument}`)
              : '';

            return (
              <div key={p._id} className="admin-applicant-card">
                <div>
                  <div className="admin-applicant-header">
                    <div className="admin-avatar-small" style={{ width: '48px', height: '48px', fontSize: '1.1rem' }}>
                      {p.user?.profilePicture ? (
                        <img src={profilePictureUrl(p.user.profilePicture)} alt="" />
                      ) : (
                        (p.user?.name || 'T').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="admin-user-name" style={{ fontSize: '1.05rem' }}>
                        {p.user?.name || 'Unknown Teacher'}
                      </div>
                      <div className="admin-user-email">{p.user?.email || 'No email registered'}</div>
                      <div style={{ marginTop: '4px' }}>
                        <span className={`admin-badge ${p.isVerified ? 'verified' : 'unverified'}`}>
                          {p.isVerified ? 'Verified Credential' : 'Pending Verification'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="admin-applicant-details" style={{ marginTop: '16px' }}>
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">Degree / Qualification:</span>
                      <span className="admin-detail-val">{p.degreeTitle || 'Not specified'}</span>
                    </div>
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">Subject Specialty:</span>
                      <span className="admin-detail-val">{p.subjectToTeach || 'General'}</span>
                    </div>
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">Teaching Experience:</span>
                      <span className="admin-detail-val">{p.teachingBio ? `${p.teachingBio.slice(0, 80)}...` : 'None provided'}</span>
                    </div>

                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--admin-card-border)' }}>
                      <span className="admin-detail-label" style={{ display: 'block', marginBottom: '6px' }}>
                        Verification Credential:
                      </span>
                      {docUrl ? (
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--admin-primary)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <FileText size={16} /> View Uploaded Document <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                          No document attached during registration.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* APPROVAL ACTIONS */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '14px', borderTop: '1px solid var(--admin-card-border)' }}>
                  {isPending ? (
                    <button
                      type="button"
                      className="admin-btn-primary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      disabled={actionLoadingId === p._id}
                      onClick={() => handleVerify(p._id, true)}
                    >
                      <CheckCircle2 size={16} />
                      {actionLoadingId === p._id ? 'Processing...' : 'Approve & Verify'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="admin-action-btn delete"
                      style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      disabled={actionLoadingId === p._id}
                      onClick={() => handleVerify(p._id, false)}
                    >
                      <XCircle size={16} />
                      {actionLoadingId === p._id ? 'Processing...' : 'Revoke Verification'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--admin-card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--admin-card-border)',
          color: 'var(--admin-text-muted)',
        }}>
          <CheckCircle2 size={40} style={{ color: '#10b981', marginBottom: '12px' }} />
          <h3 style={{ color: 'var(--admin-text-main)', marginBottom: '4px' }}>No Applications Found</h3>
          <p>There are currently no teacher applications matching the "{filter}" filter.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
