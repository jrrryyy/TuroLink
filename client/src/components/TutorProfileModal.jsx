import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Star,
  MessageCircle,
  Calendar,
  BookOpen,
  Award,
  Clock,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import api from '../services/api';
import { profilePictureUrl } from '../services/profile';
import '../styles/view-profile-modal.css';

const money = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

const dateLabel = (value) =>
  new Date(value).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

function availabilityTags(slots = []) {
  const tags = new Set();
  slots.forEach((slot) => {
    const local = new Date(new Date(slot.start).getTime() + 8 * 3600000);
    tags.add(local.getUTCDay() === 0 || local.getUTCDay() === 6 ? 'Weekends' : 'Weekdays');
    tags.add(local.getUTCHours() < 12 ? 'Mornings' : local.getUTCHours() < 18 ? 'Afternoons' : 'Evenings');
  });
  return [...tags];
}

export default function TutorProfileModal({ tutorId, isOpen, onClose }) {
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const modalRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !tutorId) return;

    let active = true;
    setLoading(true);
    setError('');

    // Trap body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    api
      .get(`/tutors/${tutorId}`)
      .then((res) => {
        if (active) setTutor(res.data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Unable to load tutor profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, tutorId, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handleStartChat = async () => {
    if (!tutor?.id || chatLoading) return;
    setChatLoading(true);
    try {
      const res = await api.post('/messages/conversations', { recipientId: tutor.id });
      onClose();
      navigate(`/student/messages?conversationId=${res.data._id}`);
    } catch {
      onClose();
      navigate(`/student/messages?recipientId=${tutor.id}`);
    } finally {
      setChatLoading(false);
    }
  };

  const handleBookSession = () => {
    onClose();
    navigate(`/student/tutors/${tutorId}`);
  };

  const tags = tutor ? availabilityTags(tutor.slots || []) : [];
  const firstName = tutor?.name ? tutor.name.split(' ')[0] : 'Tutor';

  return (
    <div
      className="view-profile-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutor-profile-name"
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

        {tutor && (
          <div className="view-profile-top-bar">
            <div className="view-profile-avatar-wrap">
              <div className="view-profile-avatar">
                {tutor.profilePicture ? (
                  <img src={profilePictureUrl(tutor.profilePicture)} alt={tutor.name} />
                ) : (
                  tutor.name?.charAt(0) || 'T'
                )}
              </div>
              <span className="view-profile-status-indicator" title="Active on TuroLink" />
            </div>
          </div>
        )}

        <div className="view-profile-body">
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--layout-muted)' }}>
              <p>Loading tutor profile…</p>
            </div>
          ) : error ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8b2020' }}>
              <p>{error}</p>
              <button
                type="button"
                className="view-profile-action-secondary"
                onClick={onClose}
                style={{ marginTop: '12px' }}
              >
                Close
              </button>
            </div>
          ) : tutor ? (
            <>

              <div className="view-profile-identity">
                <div className="view-profile-identity-header">
                  <div className="view-profile-identity-main">
                    <div className="view-profile-name-row">
                      <h2 id="tutor-profile-name" className="view-profile-name">
                        {tutor.name}
                      </h2>
                      <span className="view-profile-role-pill">
                        <Award size={13} />
                        Verified Tutor
                      </span>
                    </div>

                    <p className="view-profile-subtitle">{tutor.subject || 'Instructor'}</p>

                    <div className="view-profile-rating-row">
                      <div className="view-profile-stars" aria-hidden="true">
                        <Star size={16} fill="currentColor" />
                      </div>
                      <span>
                        {tutor.totalRatings
                          ? `${tutor.averageRating.toFixed(1)} (${tutor.totalRatings} ${
                              tutor.totalRatings === 1 ? 'review' : 'reviews'
                            })`
                          : 'No reviews yet'}
                      </span>
                    </div>
                  </div>

                  {tutor.hourlyRate && (
                    <div className="view-profile-rate-card">
                      <span className="view-profile-rate-label">Hourly Rate</span>
                      <strong className="view-profile-rate-amount">
                        {money(tutor.hourlyRate)}
                        <small>/hr</small>
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              <div className="view-profile-section">
                <h3 className="view-profile-section-title">About {firstName}</h3>
                <p className="view-profile-text">
                  {tutor.bio || 'This tutor has not added a bio yet.'}
                </p>
              </div>

              {/* Subjects Offered */}
              {tutor.subjects?.length > 0 && (
                <div className="view-profile-section">
                  <h3 className="view-profile-section-title">Subjects Offered</h3>
                  <div className="view-profile-chips">
                    {tutor.subjects.map((s) => (
                      <span key={s._id} className="view-profile-chip">
                        <BookOpen size={13} />
                        {s.code}: {s.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability Overview */}
              <div className="view-profile-section">
                <h3 className="view-profile-section-title">Availability Overview</h3>
                <div className="view-profile-chips">
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <span key={tag} className="view-profile-chip">
                        <Clock size={13} />
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="view-profile-subtitle">No scheduled slots right now</span>
                  )}
                </div>
              </div>

              {/* Student Reviews */}
              <div className="view-profile-section">
                <h3 className="view-profile-section-title">
                  Student Reviews ({tutor.reviews?.length || 0})
                </h3>
                {(!tutor.reviews || tutor.reviews.length === 0) ? (
                  <p className="view-profile-subtitle">
                    No reviews yet. Students can review after completing a tutoring session.
                  </p>
                ) : (
                  <div className="view-profile-reviews-list">
                    {tutor.reviews.map((r) => (
                      <div key={r.id || r._id} className="view-profile-review-card">
                        <div className="view-profile-review-top">
                          <span className="view-profile-reviewer-name">{r.name}</span>
                          <span className="view-profile-review-date">
                            ★ {r.rating} · {dateLabel(r.createdAt)}
                          </span>
                        </div>
                        {r.text && <p className="view-profile-review-text">{r.text}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {tutor && (
          <div className="view-profile-footer">
            <button
              type="button"
              className="view-profile-action-secondary"
              onClick={handleStartChat}
              disabled={chatLoading}
            >
              <MessageCircle size={16} />
              {chatLoading ? 'Opening…' : `Chat with ${firstName}`}
            </button>

            <button
              type="button"
              className="view-profile-action-primary"
              onClick={handleBookSession}
            >
              <Calendar size={16} />
              Book a Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
