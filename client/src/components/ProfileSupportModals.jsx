import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Globe,
  Headphones,
  HelpCircle,
  MessageSquare,
  Bug,
  Star,
  CheckCircle2,
  CalendarDays,
  BookOpen,
  MessageCircle,
  Moon,
  ChevronRight,
  Send,
  AlertTriangle
} from 'lucide-react';

export default function ProfileSupportModals({ activeModal, onClose, user, isTeacher }) {
  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackCategory, setFeedbackCategory] = useState('General Experience');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Bug report state
  const [bugSeverity, setBugSeverity] = useState('Medium');
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSubmitted, setBugSubmitted] = useState(false);

  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [languageSaved, setLanguageSaved] = useState(false);

  if (!activeModal) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!feedbackComment.trim()) return;
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setFeedbackComment('');
      onClose();
    }, 1800);
  };

  const handleBugSubmit = (e) => {
    e.preventDefault();
    if (!bugTitle.trim() || !bugDescription.trim()) return;
    setBugSubmitted(true);
    setTimeout(() => {
      setBugSubmitted(false);
      setBugTitle('');
      setBugDescription('');
      onClose();
    }, 1800);
  };

  const handleLanguageSelect = (langCode) => {
    setSelectedLanguage(langCode);
    setLanguageSaved(true);
    setTimeout(() => {
      setLanguageSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      className="profile-modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="profile-modal-card">
        {/* Header */}
        <div className="profile-modal-header">
          <div className="profile-modal-title-group">
            {activeModal === 'whatsNew' && <Sparkles className="profile-modal-icon green" size={20} />}
            {activeModal === 'language' && <Globe className="profile-modal-icon green" size={20} />}
            {activeModal === 'support' && <Headphones className="profile-modal-icon green" size={20} />}
            {activeModal === 'feedback' && <MessageSquare className="profile-modal-icon green" size={20} />}
            {activeModal === 'reportBug' && <Bug className="profile-modal-icon red" size={20} />}

            <h2>
              {activeModal === 'whatsNew' && "What's New in TuroLink"}
              {activeModal === 'language' && "Language Preferences"}
              {activeModal === 'support' && "Help & Support Center"}
              {activeModal === 'feedback' && "Send Feedback"}
              {activeModal === 'reportBug' && "Report a Bug"}
            </h2>
          </div>
          <button
            type="button"
            className="profile-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="profile-modal-body">
          {/* 1. What's New */}
          {activeModal === 'whatsNew' && (
            <div className="profile-whats-new-wrap">
              <div className="whats-new-badge-row">
                <span className="whats-new-pill">Release v2.4</span>
                <span className="whats-new-date">October 2026</span>
              </div>
              <p className="whats-new-intro">
                Discover the latest features and optimizations engineered to elevate learning and teaching on TuroLink.
              </p>

              <div className="whats-new-features-list">
                <div className="whats-new-feature-card">
                  <div className="whats-new-icon-box">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <strong>Interactive Classwork & Assessment Tracking</strong>
                    <p>Live progress tracking, quiz percentage scoring, and subject performance metrics with instant tutor feedback.</p>
                  </div>
                </div>

                <div className="whats-new-feature-card">
                  <div className="whats-new-icon-box">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <strong>Streamlined 1-on-1 Tutoring Scheduling</strong>
                    <p>Intuitive session scheduling with verified tutors, instant time-zone conversion (Manila UTC+8), and booking request management.</p>
                  </div>
                </div>

                <div className="whats-new-feature-card">
                  <div className="whats-new-icon-box">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <strong>Real-time Direct Messaging</strong>
                    <p>Communicate seamlessly with your teachers and students, share files, and receive instant session alerts.</p>
                  </div>
                </div>

                <div className="whats-new-feature-card">
                  <div className="whats-new-icon-box">
                    <Moon size={20} />
                  </div>
                  <div>
                    <strong>Enhanced Theme Customization</strong>
                    <p>Experience a high-contrast dark mode tailored for late-night study sessions, reduced eye strain, and faster page loads.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Language Selector */}
          {activeModal === 'language' && (
            <div className="profile-language-wrap">
              <p className="profile-modal-desc">
                Select your preferred display language for the TuroLink interface:
              </p>

              <div className="profile-language-list">
                <button
                  type="button"
                  className={`profile-language-option ${selectedLanguage === 'en-US' ? 'active' : ''}`}
                  onClick={() => handleLanguageSelect('en-US')}
                >
                  <div>
                    <strong>English (United States)</strong>
                    <span>US English · Default</span>
                  </div>
                  {selectedLanguage === 'en-US' && <CheckCircle2 size={18} className="profile-lang-check" />}
                </button>

                <button
                  type="button"
                  className={`profile-language-option ${selectedLanguage === 'fil-PH' ? 'active' : ''}`}
                  onClick={() => handleLanguageSelect('fil-PH')}
                >
                  <div>
                    <strong>Filipino (Tagalog)</strong>
                    <span>Wikang Pambansa ng Pilipinas</span>
                  </div>
                  {selectedLanguage === 'fil-PH' && <CheckCircle2 size={18} className="profile-lang-check" />}
                </button>

                <button
                  type="button"
                  className="profile-language-option disabled"
                  disabled
                >
                  <div>
                    <strong>Cebuano (Bisaya)</strong>
                    <span>Regional · Coming soon</span>
                  </div>
                </button>
              </div>

              {languageSaved && (
                <div className="profile-modal-toast success">
                  <CheckCircle2 size={16} />
                  <span>Language updated successfully!</span>
                </div>
              )}
            </div>
          )}

          {/* 3. Support & FAQs */}
          {activeModal === 'support' && (
            <div className="profile-support-wrap">
              <p className="profile-modal-desc">
                Need guidance? Here are the quickest solutions for our {isTeacher ? 'teachers' : 'students'}:
              </p>

              <div className="profile-faq-list">
                <details className="profile-faq-item">
                  <summary>
                    <span>{isTeacher ? 'How do I accept or decline session requests?' : 'How do I book a tutoring session?'}</span>
                    <ChevronRight size={16} className="faq-chevron" />
                  </summary>
                  <p>
                    {isTeacher
                      ? 'Navigate to "Requests" from your sidebar. You can review the student request details, then click "Accept" or "Decline". Confirmed sessions automatically appear in your Schedules.'
                      : 'Go to "Find Tutor", explore verified tutors by subject or degree, select a date and open time slot, and confirm your booking request.'}
                  </p>
                </details>

                <details className="profile-faq-item">
                  <summary>
                    <span>{isTeacher ? 'How do I grade student submissions?' : 'Where do I submit assignments and quizzes?'}</span>
                    <ChevronRight size={16} className="faq-chevron" />
                  </summary>
                  <p>
                    {isTeacher
                      ? 'Open "My Subjects", select your subject, click on any posted material, and view the Submissions tab. Enter the numerical grade and written feedback, then click "Post Grade".'
                      : 'Navigate to "My Subjects", click your subject, select the assignment or quiz tab, type your answer or attach files, and click "Turn In".'}
                  </p>
                </details>

                <details className="profile-faq-item">
                  <summary>
                    <span>How does direct messaging work?</span>
                    <ChevronRight size={16} className="faq-chevron" />
                  </summary>
                  <p>
                    Click "Messages" in your sidebar to initiate chats with enrolled students or instructors. Unread badges update automatically.
                  </p>
                </details>
              </div>

              <div className="profile-support-contact-box">
                <Headphones size={22} className="contact-box-icon" />
                <div>
                  <strong>Still need assistance?</strong>
                  <p>Our academic support team is ready to help at <code>support@turolink.com</code></p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Feedback */}
          {activeModal === 'feedback' && (
            <div className="profile-feedback-wrap">
              {feedbackSubmitted ? (
                <div className="profile-modal-success-state">
                  <CheckCircle2 size={44} className="success-icon" />
                  <h3>Thank you for your feedback!</h3>
                  <p>Your suggestions directly influence our upcoming feature releases.</p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit}>
                  <p className="profile-modal-desc">
                    How has your experience on TuroLink been so far?
                  </p>

                  <div className="feedback-stars-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        className={`feedback-star-btn ${feedbackRating >= star ? 'active' : ''}`}
                        onClick={() => setFeedbackRating(star)}
                        aria-label={`Rate ${star} star`}
                      >
                        <Star size={24} fill={feedbackRating >= star ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                    <span className="feedback-rating-label">
                      {feedbackRating === 5 && 'Exceptional! 🌟'}
                      {feedbackRating === 4 && 'Great experience 👍'}
                      {feedbackRating === 3 && 'Good / Satisfactory 👌'}
                      {feedbackRating === 2 && 'Needs improvement ⚠️'}
                      {feedbackRating === 1 && 'Difficult / Unsatisfactory ❌'}
                    </span>
                  </div>

                  <div className="feedback-form-group">
                    <label>Category</label>
                    <select
                      value={feedbackCategory}
                      onChange={(e) => setFeedbackCategory(e.target.value)}
                    >
                      <option value="General Experience">General Experience</option>
                      <option value="Subjects & Classwork">Subjects &amp; Classwork</option>
                      <option value="Tutor Booking">Tutor Booking</option>
                      <option value="Messaging & Chats">Messaging &amp; Chats</option>
                      <option value="Feature Request">Feature Request / Idea</option>
                    </select>
                  </div>

                  <div className="feedback-form-group">
                    <label>Your Message</label>
                    <textarea
                      required
                      rows={4}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Tell us what you like or how we can make your learning experience better..."
                    />
                  </div>

                  <div className="profile-modal-footer">
                    <button type="button" className="profile-modal-cancel" onClick={onClose}>
                      Cancel
                    </button>
                    <button type="submit" className="profile-modal-submit">
                      <Send size={15} /> Send Feedback
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 5. Report a Bug */}
          {activeModal === 'reportBug' && (
            <div className="profile-bug-wrap">
              {bugSubmitted ? (
                <div className="profile-modal-success-state">
                  <CheckCircle2 size={44} className="success-icon" />
                  <h3>Bug report received</h3>
                  <p>Our engineering team has logged this issue and is working on a fix. Thank you!</p>
                </div>
              ) : (
                <form onSubmit={handleBugSubmit}>
                  <p className="profile-modal-desc">
                    Found something broken or not working as expected? Help us resolve it quickly:
                  </p>

                  <div className="feedback-form-group">
                    <label>Severity Level</label>
                    <div className="bug-severity-pills">
                      {['Low', 'Medium', 'Critical'].map((level) => (
                        <button
                          type="button"
                          key={level}
                          className={`bug-severity-btn ${bugSeverity === level ? 'active ' + level.toLowerCase() : ''}`}
                          onClick={() => setBugSeverity(level)}
                        >
                          {level === 'Critical' && <AlertTriangle size={13} />}
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="feedback-form-group">
                    <label>Issue Summary</label>
                    <input
                      type="text"
                      required
                      value={bugTitle}
                      onChange={(e) => setBugTitle(e.target.value)}
                      placeholder="e.g. Schedule button not responding on mobile"
                    />
                  </div>

                  <div className="feedback-form-group">
                    <label>Details &amp; Steps to Reproduce</label>
                    <textarea
                      required
                      rows={4}
                      value={bugDescription}
                      onChange={(e) => setBugDescription(e.target.value)}
                      placeholder="Please describe what happened, what you expected, and any error message you saw..."
                    />
                  </div>

                  <div className="profile-modal-footer">
                    <button type="button" className="profile-modal-cancel" onClick={onClose}>
                      Cancel
                    </button>
                    <button type="submit" className="profile-modal-submit bug">
                      <Bug size={15} /> Submit Report
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
