import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Mail,
  Phone,
  User,
  Settings,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import { profilePictureUrl } from '../services/profile';
import '../styles/view-profile-modal.css';

export default function UserProfileModal({ user, isOpen, onClose }) {
  const modalRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    // Trap body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handleGoToSettings = () => {
    onClose();
    const destination = user.role === 'teacher' ? '/teacher/settings' : '/student/settings';
    navigate(destination);
  };

  const isTeacher = user.role === 'teacher';
  const firstLetter = user.name?.trim().charAt(0).toUpperCase() || 'U';

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
              {user.profilePicture ? (
                <img src={profilePictureUrl(user.profilePicture)} alt={user.name} />
              ) : (
                firstLetter
              )}
            </div>
            <span className="view-profile-status-indicator" title="Signed In" />
          </div>
        </div>

        <div className="view-profile-body">
          <div className="view-profile-identity">
            <div className="view-profile-name-row">
              <h2 id="user-profile-name" className="view-profile-name">
                {user.name}
              </h2>
              <span className="view-profile-role-pill">
                {isTeacher ? <GraduationCap size={13} /> : <ShieldCheck size={13} />}
                {isTeacher ? 'Teacher' : 'Student'}
              </span>
            </div>

            <p className="view-profile-subtitle">{user.email}</p>
          </div>

          {/* About / Bio */}
          <div className="view-profile-section">
            <h3 className="view-profile-section-title">About</h3>
            <p className="view-profile-text">
              {user.bio || 'You haven’t added a bio yet. Click "Edit Profile" to write something about yourself!'}
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
                  <span>{user.email}</span>
                </div>
              </div>

              <div className="view-profile-info-item">
                <Phone size={18} className="view-profile-info-icon" />
                <div>
                  <strong>Phone</strong>
                  <span>{user.phone || 'Not provided'}</span>
                </div>
              </div>

              <div className="view-profile-info-item">
                <User size={18} className="view-profile-info-icon" />
                <div>
                  <strong>Gender / Sex</strong>
                  <span style={{ textTransform: 'capitalize' }}>
                    {user.sex ? user.sex.replace(/-/g, ' ') : 'Not specified'}
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

          <button
            type="button"
            className="view-profile-action-primary"
            onClick={handleGoToSettings}
          >
            <Settings size={16} />
            Edit Profile &amp; Settings
          </button>
        </div>
      </div>
    </div>
  );
}
