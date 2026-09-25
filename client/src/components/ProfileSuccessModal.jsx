import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import '../styles/profile-success-modal.css';

export default function ProfileSuccessModal({
  isOpen,
  onClose,
  title = 'Congratulation',
  message = 'Your profile has been successfully updated.',
}) {
  const cardRef = useRef(null);
  const okayButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus okay button on open
    okayButtonRef.current?.focus();

    // Prevent background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (cardRef.current && !cardRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <div
      className="profile-success-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-success-title"
      aria-describedby="profile-success-desc"
    >
      <div className="profile-success-card" ref={cardRef}>
        <div className="profile-success-icon-wrap" aria-hidden="true">
          <Check size={42} strokeWidth={2.8} />
        </div>

        <h2 id="profile-success-title" className="profile-success-title">
          {title}
        </h2>

        <p id="profile-success-desc" className="profile-success-message">
          {message}
        </p>

        <button
          ref={okayButtonRef}
          type="button"
          className="profile-success-btn"
          onClick={onClose}
        >
          Okay
        </button>
      </div>
    </div>
  );
}
