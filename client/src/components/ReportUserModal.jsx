import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import { profilePictureUrl } from '../services/profile';
import '../styles/report-user-modal.css';

const CATEGORIES = [
  {
    id: 'fraud',
    title: 'Fraud / Non-Payment',
    subtitle: 'Did not pay for tutorial sessions, payment evasion, or financial deception',
  },
  {
    id: 'fake_profile',
    title: 'Fake Profile / Not a Real Teacher',
    subtitle: 'Fabricated credentials, misleading teaching background, or impersonation',
  },
  {
    id: 'harassment',
    title: 'Harassment / Abusive Behavior',
    subtitle: 'Threats, bullying, offensive remarks, or disrespectful conduct',
  },
  {
    id: 'scam',
    title: 'Scam or Phishing Attempt',
    subtitle: 'Suspicious links, attempting off-platform transactions, or credential phishing',
  },
  {
    id: 'inappropriate_content',
    title: 'Inappropriate Content or Messages',
    subtitle: 'Vulgar language, inappropriate images, or unsolicited content',
  },
  {
    id: 'other',
    title: 'Other Violation',
    subtitle: 'Any other violation of TuroLink community standards',
  },
];

export default function ReportUserModal({
  isOpen,
  onClose,
  targetUser,
  onReportSubmitted,
}) {
  const modalRef = useRef(null);
  const [category, setCategory] = useState('fraud');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCategory('fraud');
      setDescription('');
      setError('');
      setSubmitted(false);
      setSubmitting(false);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !targetUser) return null;

  const targetId = targetUser._id || targetUser.id;
  const targetName = targetUser.name || 'User';
  const targetRole = targetUser.role || 'user';
  const firstLetter = targetName.charAt(0).toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 5) {
      setError('Please provide a detailed description of the incident (at least 5 characters).');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await api.post('/reports', {
        reportedUserId: targetId,
        category,
        description: description.trim(),
      });
      setSubmitted(true);
      onReportSubmitted?.(targetId);
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to submit report. Please check your connection.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <div
      className="report-modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="report-modal-card" ref={modalRef}>
        {submitted ? (
          <div className="report-success-view">
            <div className="report-success-icon-wrap">
              <CheckCircle2 size={32} />
            </div>
            <h3>Complaint Filed with Administration</h3>
            <p>
              Your report against <strong>{targetName}</strong> has been logged. Platform
              administrators will investigate the complaint and take appropriate action,
              including a permanent lifetime ban if the violation is confirmed.
            </p>
            <button
              type="button"
              className="report-success-done-btn"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
            <div className="report-modal-header">
              <div className="report-modal-title-group">
                <div className="report-modal-icon-badge">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 id="report-modal-title">File a Complaint</h3>
                  <p>Send an official misconduct report to platform administration</p>
                </div>
              </div>
              <button
                type="button"
                className="report-modal-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="report-modal-body">
              {/* Accused User Summary */}
              <div className="report-target-user-strip">
                <div className="report-target-user-left">
                  <div className="report-target-avatar">
                    {targetUser.profilePicture ? (
                      <img src={profilePictureUrl(targetUser.profilePicture)} alt="" />
                    ) : (
                      firstLetter
                    )}
                  </div>
                  <div className="report-target-info">
                    <strong>{targetName}</strong>
                    <span>{targetRole}</span>
                  </div>
                </div>
                <span className={`report-target-badge ${targetRole}`}>{targetRole}</span>
              </div>

              {error && <div className="report-modal-error">{error}</div>}

              {/* Violation Category Picker */}
              <div className="report-category-section">
                <label className="report-section-label">
                  Reason for Complaint
                </label>
                <div className="report-category-grid">
                  {CATEGORIES.map((cat) => {
                    const active = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`report-category-btn ${active ? 'active' : ''}`}
                        onClick={() => setCategory(cat.id)}
                      >
                        <div className="report-category-dot">
                          {active && <div className="report-category-dot-inner" />}
                        </div>
                        <div className="report-category-text">
                          <strong>{cat.title}</strong>
                          <span>{cat.subtitle}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description Section */}
              <div className="report-textarea-section">
                <label htmlFor="report-description" className="report-section-label">
                  Detailed Explanation & Evidence
                </label>
                <textarea
                  id="report-description"
                  className="report-textarea"
                  rows={4}
                  maxLength={3000}
                  placeholder="Provide detailed facts: dates, agreed rates or sessions, specific messages, or fake credentials presented..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                />
                <div className="report-textarea-counter">
                  {description.length} / 3,000 characters (minimum 5)
                </div>
              </div>

              <div className="report-security-notice">
                <Lock size={15} />
                <span>
                  Reports are private and directly reviewed by TuroLink administrators. The
                  reported user will not see who filed the report.
                </span>
              </div>
            </div>

            <div className="report-modal-footer">
              <button
                type="button"
                className="report-btn-cancel"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="report-btn-submit"
                disabled={submitting || description.trim().length < 5}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    <AlertTriangle size={15} /> Submit Complaint
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
