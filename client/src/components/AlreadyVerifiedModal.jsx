import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, LogIn, X } from 'lucide-react';
import '../styles/already-verified-modal.css';

export default function AlreadyVerifiedModal({ isOpen, onClose, message }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    if (onClose) onClose();
    navigate('/login');
  };

  return (
    <div
      className="av-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="av-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="av-modal-card">
        {onClose && (
          <button
            type="button"
            className="av-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}

        <div className="av-modal-icon-wrap">
          <CheckCircle2 size={36} className="av-modal-icon" />
        </div>

        <h2 id="av-modal-title" className="av-modal-title">
          Account Already Verified
        </h2>

        <p className="av-modal-message">
          {message || 'Your account is already verified. Please log in to continue.'}
        </p>

        <div className="av-modal-actions">
          <button
            type="button"
            className="av-modal-btn-primary"
            onClick={handleLogin}
            autoFocus
          >
            <LogIn size={18} />
            Go to Login
          </button>
          {onClose && (
            <button
              type="button"
              className="av-modal-btn-secondary"
              onClick={onClose}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
