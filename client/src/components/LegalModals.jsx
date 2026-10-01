import { useEffect } from 'react';
import { X } from 'lucide-react';
import '../styles/legal-modals.css';

export default function LegalModals({ activeModal, onClose, onAccept }) {
  useEffect(() => {
    if (!activeModal) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [activeModal, onClose]);

  if (!activeModal) return null;

  const handleUnderstand = () => {
    if (onAccept) onAccept(activeModal);
    onClose();
  };

  const isTerms = activeModal === 'terms';
  const isPrivacy = activeModal === 'privacy';

  return (
    <div
      className="legal-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={isTerms ? 'Terms of Service' : 'Privacy Policy'}
    >
      <div className="legal-modal-dialog">
        {/* Top Header Bar */}
        <header className="legal-modal-topbar">
          <button
            type="button"
            className="legal-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={22} />
          </button>
          <div className="legal-modal-topbar-title">
            {isTerms ? 'Terms of Service' : 'Privacy Policy'}
          </div>
          <div className="legal-modal-topbar-spacer" />
        </header>

        {/* Scrollable Content Body */}
        <div className="legal-modal-body">
          {isTerms && (
            <article className="legal-modal-article">
              <h1 className="legal-modal-main-heading">Terms of Service</h1>
              <p className="legal-modal-updated">Last Updated: September 2026</p>

              <section className="legal-modal-section">
                <h2>1. Acceptance of Terms</h2>
                <p>
                  By accessing and registering an account on the TuroLink platform,
                  you agree to be bound by these Terms of Service and all applicable
                  laws and regulations. If you do not agree with any of these terms,
                  you are prohibited from using or accessing this platform.
                </p>
              </section>

              <section className="legal-modal-section">
                <h2>2. Description of Service</h2>
                <p>
                  TuroLink is a collaborative educational platform connecting students
                  with qualified peer tutors and professional educators. Services include
                  personalized 1-on-1 tutoring sessions, classroom announcements, learning
                  material distribution, assignment turn-in, and feedback sharing.
                </p>
              </section>

              <section className="legal-modal-section">
                <h2>3. User Accounts & Responsibilities</h2>
                <p>
                  When registering, you must provide accurate, current, and complete
                  information. You are responsible for safeguarding your password and for
                  all activities that occur under your account.
                </p>
                <ul>
                  <li>Maintain confidential login credentials.</li>
                  <li>Notify TuroLink immediately of any unauthorized account access.</li>
                  <li>Use the platform exclusively for lawful educational purposes.</li>
                </ul>
              </section>

              <section className="legal-modal-section">
                <h2>4. Tutoring Sessions, Booking & Conduct</h2>
                <p>
                  Students and teachers must adhere to respectful, professional standards of
                  conduct during all virtual tutoring sessions and classroom discussions.
                  Cancellations or rescheduling must be communicated promptly through the platform.
                </p>
              </section>

              <section className="legal-modal-section">
                <h2>5. Academic Integrity & Safety</h2>
                <p>
                  TuroLink strictly prohibits plagiarism, academic cheating, harassment, or
                  the sharing of inappropriate content. Violations may result in immediate
                  account suspension and revocation of tutoring privileges.
                </p>
              </section>

              <section className="legal-modal-section">
                <h2>6. Modifications to Terms</h2>
                <p>
                  TuroLink reserves the right to revise these Terms of Service at any time.
                  Continued use of the platform constitutes agreement to the updated terms.
                </p>
              </section>
            </article>
          )}

          {isPrivacy && (
            <article className="legal-modal-article">
              <h1 className="legal-modal-main-heading">Privacy Policy</h1>
              <p className="legal-modal-updated">Last Updated: September 2026</p>

              <section className="legal-modal-section">
                <h2>1. Information We Collect</h2>
                <p>We collect the following types of information:</p>
                <ul>
                  <li><strong>Personal Information:</strong> Full name, email address, Philippine mobile number.</li>
                  <li><strong>Academic Information:</strong> Enrolled subjects, educational degree, teaching specialty, and tutor reviews.</li>
                  <li><strong>Verification Documents:</strong> For educators, identification and educational credentials submitted for approval.</li>
                  <li><strong>Learning Activities:</strong> Assignment submissions, announcement comments, and tutoring session history.</li>
                </ul>
              </section>

              <section className="legal-modal-section">
                <h2>2. How We Use Your Information</h2>
                <p>Your information is used to:</p>
                <ul>
                  <li>Create and manage your student or teacher account.</li>
                  <li>Connect students with verified tutors based on subject demand.</li>
                  <li>Facilitate real-time messaging, schedules, and notifications.</li>
                  <li>Verify teacher credentials and maintain platform safety and trust.</li>
                </ul>
              </section>

              <section className="legal-modal-section">
                <h2>3. Data Protection & Security</h2>
                <p>
                  We implement robust technical and organizational security measures,
                  including encrypted sessions, hashed passwords, and strict role-based access
                  controls to protect your personal information against unauthorized access.
                </p>
              </section>

              <section className="legal-modal-section">
                <h2>4. Your Rights & Choices</h2>
                <p>
                  You have the right to access, update, or request the deletion of your personal
                  data at any time through your Account Settings or by reaching out via our Support channels.
                </p>
              </section>
            </article>
          )}
        </div>

        {/* Fixed Footer with "I Understand" Button */}
        <footer className="legal-modal-footer">
          <button
            type="button"
            className="legal-modal-understand-btn"
            onClick={handleUnderstand}
          >
            I Understand
          </button>
        </footer>
      </div>
    </div>
  );
}
