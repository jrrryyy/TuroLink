import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Mail,
  Phone,
  User,
  ShieldCheck,
  GraduationCap,
  AlertTriangle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { profilePictureUrl } from '../services/profile';
import ReportUserModal from './ReportUserModal';
import '../styles/view-profile-modal.css';

export default function UserProfileModal({
  user,
  targetId: propTargetId,
  isOpen = true,
  onClose,
  onStartConversation,
}) {
  const { user: currentUser } = useAuth();
  const modalRef = useRef(null);
  const targetId = propTargetId || user?._id || user?.id;
  const [profileData, setProfileData] = useState(user || null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    setProfileData(user || null);
  }, [user]);

  // Fetch full user profile details if targetId is present
  useEffect(() => {
    if (!isOpen || !targetId) return;

    let active = true;
    api
      .get(`/messages/users/${targetId}`)
      .then((res) => {
        if (active && res.data) {
          setProfileData((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isOpen, targetId]);

  useEffect(() => {
    if (!isOpen) return;

    // Trap body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const activeUser = profileData || user;
  if (!isOpen || (!user && !propTargetId) || !activeUser) return null;

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const isTeacher = activeUser.role === 'teacher';
  const firstLetter = activeUser.name?.trim().charAt(0).toUpperCase() || 'U';

  const currentUserId = currentUser?._id || currentUser?.id;
  const profileUserId = activeUser?._id || activeUser?.id || targetId;

  const isOwnProfile = Boolean(
    currentUser && (
      (currentUserId && profileUserId && String(currentUserId) === String(profileUserId)) ||
      (currentUser?.email && activeUser?.email && currentUser.email.toLowerCase() === activeUser.email.toLowerCase())
    )
  );

  return (
    <div
      className="view-profile-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-name"
    >
      <div className="view-profile-modal" ref={modalRef}>
        <div className="view-profile-banner">
          <button
            type="button"
            className="view-profile-close-btn"
            onClick={onClose}
            aria-label="Close profile"
          >
            <X size={18} />
          </button>
        </div>

        <div className="view-profile-top-bar">
          <div className="view-profile-avatar-wrap">
            <div className="view-profile-avatar">
              {activeUser.profilePicture ? (
                <img src={profilePictureUrl(activeUser.profilePicture)} alt={activeUser.name} />
              ) : (
                firstLetter
              )}
            </div>
            <span className="view-profile-status-indicator" title="Active on TuroLink" />
          </div>

          {!isOwnProfile && (
            <div className="view-profile-top-actions">
              <button
                type="button"
                className="view-profile-report-btn"
                onClick={() => setShowReportModal(true)}
                title="Report User to Administration"
              >
                <AlertTriangle size={14} />
                <span>Report User</span>
              </button>
            </div>
          )}
        </div>

        <div className="view-profile-body">
          <div className="view-profile-identity">
            <div className="view-profile-name-row">
              <h2 id="user-profile-name" className="view-profile-name">
                {activeUser.name}
              </h2>
              <span className="view-profile-role-pill">
                {isTeacher ? <GraduationCap size={13} /> : <ShieldCheck size={13} />}
                {isTeacher ? 'Teacher' : 'Student'}
              </span>
            </div>

            <p className="view-profile-subtitle">{activeUser.email}</p>
          </div>

          {/* About / Bio */}
          <div className="view-profile-section">
            <h3 className="view-profile-section-title">About</h3>
            <p className="view-profile-text">
              {activeUser.bio || 'No bio provided yet.'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="view-profile-section">
            <h3 className="view-profile-section-title">Account Information</h3>
            <div className="view-profile-info-grid">
              <div className="view-profile-info-item">
                <Mail size={18} className="view-profile-info-icon" />
                <div>
                  <strong>Email</strong>
                  <span>{activeUser.email}</span>
                </div>
              </div>

              <div className="view-profile-info-item">
                <Phone size={18} className="view-profile-info-icon" />
                <div>
                  <strong>Phone</strong>
                  <span>{activeUser.phone || 'Not provided'}</span>
                </div>
              </div>

              <div className="view-profile-info-item">
                <User size={18} className="view-profile-info-icon" />
                <div>
                  <strong>Gender / Sex</strong>
                  <span style={{ textTransform: 'capitalize' }}>
                    {activeUser.sex ? activeUser.sex.replace(/-/g, ' ') : 'Not specified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="view-profile-footer">
          <button
            type="button"
            className="view-profile-action-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <ReportUserModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetUser={activeUser}
        />
      </div>
    </div>
  );
}
