import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import '../styles/confirmation-modal.css';

export default function ConfirmationModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = true,
  isLoading = false,
  icon = null,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="turolink-confirm-overlay"
      onClick={() => {
        if (!isLoading) onCancel?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="turolink-confirm-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="turolink-confirm-close"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className={`turolink-confirm-icon-box ${isDanger ? 'danger' : 'warning'}`}>
          {icon || (isDanger ? <Trash2 size={24} /> : <AlertTriangle size={24} />)}
        </div>

        <h3 id="confirm-modal-title" className="turolink-confirm-title">
          {title}
        </h3>

        <p className="turolink-confirm-message">
          {message}
        </p>

        <div className="turolink-confirm-actions">
          <button
            type="button"
            className="turolink-confirm-cancel-btn"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`turolink-confirm-action-btn ${isDanger ? 'danger' : 'primary'}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
