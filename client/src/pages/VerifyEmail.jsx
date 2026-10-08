import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Mail,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Edit3,
  ArrowLeft,
  Inbox
} from 'lucide-react';
import api from '../services/api';
import AlreadyVerifiedModal from '../components/AlreadyVerifiedModal';
import '../styles/auth-security.css';

const LINK_EXPIRATION_SECONDS = 180; // 3 minutes

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  // URL hash token if opened from an email link
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '');

  // Email passed from registration/login
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [message, setMessage] = useState(() => location.state?.message || '');
  const [statusType, setStatusType] = useState('info'); // 'info' | 'success' | 'error' | 'expired'

  // Expiration timestamp (defaults to 3 mins from now)
  const [expiresAt, setExpiresAt] = useState(() => {
    return location.state?.expiresAt || (Date.now() + LINK_EXPIRATION_SECONDS * 1000);
  });

  // Time remaining in seconds
  const [timeLeft, setTimeLeft] = useState(() => {
    const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
    return Math.max(0, remaining > 0 ? remaining : LINK_EXPIRATION_SECONDS);
  });

  // Cooldown to prevent spamming / accidental clicks (starts at 60s on arrival)
  const [resendCooldown, setResendCooldown] = useState(60);

  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showAlreadyVerified, setShowAlreadyVerified] = useState(false);
  const [showEditEmail, setShowEditEmail] = useState(!email);
  const [editEmailValue, setEditEmailValue] = useState(email);

  const isExpired = timeLeft <= 0;
  const isGmail = email.toLowerCase().endsWith('@gmail.com');

  // Format MM:SS for countdown
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // 1. Live Countdown Effect (ticks every 1 second)
  useEffect(() => {
    if (verified || token) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, verified, token]);

  // 2. Resend Cooldown Countdown (ticks every 1 second)
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const cooldownInterval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(cooldownInterval);
  }, [resendCooldown]);

  // 3. Auto-verify if user opened email link with #token=...
  useEffect(() => {
    if (!token) return;

    const autoVerify = async () => {
      setBusy(true);
      try {
        const { data } = await api.post('/auth/verify-email', { token });
        setVerified(true);
        setStatusType('success');
        setMessage(data.message || 'Email verified successfully! You can now sign in.');
        window.history.replaceState(null, '', location.pathname);
      } catch (error) {
        const errCode = error.response?.data?.code;
        const errMsg = error.response?.data?.message || '';

        if (errCode === 'ALREADY_VERIFIED' || /already verified/i.test(errMsg)) {
          setShowAlreadyVerified(true);
        } else if (errCode === 'TOKEN_EXPIRED') {
          setStatusType('expired');
          setMessage('This verification link has expired (links are valid for 3 minutes). Please request a new link below.');
        } else {
          setStatusType('error');
          setMessage(errMsg || 'This verification link is invalid or has expired.');
        }
      } finally {
        setBusy(false);
      }
    };

    autoVerify();
  }, [token, location.pathname]);

  // Handle Resend Verification
  const handleResend = async (e) => {
    if (e) e.preventDefault();
    const targetEmail = (editEmailValue || email).trim();

    if (!targetEmail) {
      setMessage('Please enter a valid email address.');
      setStatusType('error');
      setShowEditEmail(true);
      return;
    }

    if (resendCooldown > 0 && !isExpired) {
      setMessage(`Please wait ${resendCooldown} seconds before requesting another email.`);
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post('/auth/resend-verification', { email: targetEmail });
      setEmail(targetEmail);
      setShowEditEmail(false);

      // Reset 3-minute link expiration timer and 60-second button cooldown
      const newExpiresAt = data.expiresAt || (Date.now() + LINK_EXPIRATION_SECONDS * 1000);
      setExpiresAt(newExpiresAt);
      setTimeLeft(LINK_EXPIRATION_SECONDS);
      setResendCooldown(60);

      setStatusType('success');
      setMessage('A fresh verification link has been sent to your inbox. Check your spam folder too.');
    } catch (error) {
      const errCode = error.response?.data?.code;
      const errMsg = error.response?.data?.message || '';

      if (errCode === 'ALREADY_VERIFIED' || /already verified/i.test(errMsg)) {
        setShowAlreadyVerified(true);
      } else {
        setStatusType('error');
        setMessage(errMsg || 'Unable to send verification email. Please check your connection.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="security-page">
      <AlreadyVerifiedModal
        isOpen={showAlreadyVerified}
        onClose={() => setShowAlreadyVerified(false)}
        message="Your account is already verified. Please log in to continue."
      />

      <section className="security-card verify-email-card">
        <Link to="/" className="security-brand">TuroLink</Link>

        {/* ── CASE 1: VERIFIED SUCCESS ── */}
        {verified ? (
          <div className="verify-state-container success-state">
            <div className="verify-hero-icon success">
              <CheckCircle2 size={44} />
            </div>
            <h1>Email Verified!</h1>
            <p className="verify-description">
              Your email address has been successfully verified. Your TuroLink account is now active.
            </p>
            <div className="verify-actions-group">
              <button
                type="button"
                className="verify-primary-btn"
                onClick={() => navigate('/login')}
              >
                Sign in to your account
              </button>
            </div>
          </div>
        ) : token ? (
          /* ── CASE 2: TOKEN IN URL (VERIFYING OR FAILED) ── */
          <div className="verify-state-container">
            {busy ? (
              <>
                <div className="verify-hero-icon info rotating">
                  <RefreshCw size={36} />
                </div>
                <h1>Verifying your email…</h1>
                <p className="verify-description">
                  Please wait while we confirm your verification link with the server.
                </p>
              </>
            ) : statusType === 'expired' ? (
              <>
                <div className="verify-hero-icon warning">
                  <Clock size={40} />
                </div>
                <h1>Link Expired</h1>
                <p className="verify-description">
                  {message || 'This verification link has expired (links are valid for 3 minutes).'}
                </p>
                <form onSubmit={handleResend} className="verify-resend-form">
                  <label>
                    Your email address
                    <input
                      type="email"
                      required
                      value={editEmailValue}
                      onChange={(e) => setEditEmailValue(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </label>
                  <button type="submit" disabled={busy} className="verify-primary-btn">
                    {busy ? 'Sending…' : 'Send new verification link'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="verify-hero-icon error">
                  <AlertCircle size={40} />
                </div>
                <h1>Verification Issue</h1>
                <p className="verify-description">{message}</p>
                <button
                  type="button"
                  className="verify-primary-btn"
                  onClick={() => navigate('/login')}
                >
                  Go to Sign In
                </button>
              </>
            )}
          </div>
        ) : (
          /* ── CASE 3: AWAITING VERIFICATION (JUST REGISTERED / REQUESTED RESEND) ── */
          <div className="verify-state-container">
            <div className="verify-hero-icon info">
              <Inbox size={40} />
            </div>

            <h1>Check your inbox</h1>

            <p className="verify-subtitle">
              We've sent a verification link to:
            </p>

            {email && (
              <div className="verify-email-chip">
                <Mail size={15} />
                <strong>{email}</strong>
              </div>
            )}

            {/* LIVE 3-MINUTE COUNTDOWN TIMER */}
            <div className={`verify-timer-box ${isExpired ? 'is-expired' : 'is-active'}`}>
              <div className="timer-icon-wrap">
                {isExpired ? <AlertCircle size={20} /> : <Clock size={20} />}
              </div>
              <div className="timer-text-wrap">
                <span className="timer-label">
                  {isExpired ? 'Verification link expired' : 'Link active · expires in'}
                </span>
                <span className="timer-countdown">
                  {isExpired ? '00:00 (Time ran out)' : formatTime(timeLeft)}
                </span>
              </div>
              <span className={`timer-status-pill ${isExpired ? 'expired' : 'active'}`}>
                {isExpired ? 'Expired' : '3m limit'}
              </span>
            </div>

            {isExpired ? (
              <div className="verify-notice-box expired-alert">
                <AlertCircle size={16} />
                <span>
                  Your 3-minute verification link has expired. Click below to generate a new link.
                </span>
              </div>
            ) : (
              <p className="verify-guidance-text">
                Click the link in the email to activate your account. If you don't see it in a few seconds, check your <strong>Spam</strong> or <strong>Junk</strong> folder.
              </p>
            )}

            {/* PRIMARY USER ACTION: OPEN MAIL APP */}
            {!isExpired && (
              <div className="verify-primary-action-wrap">
                <a
                  href={isGmail ? 'https://mail.google.com' : 'mailto:'}
                  target={isGmail ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="verify-open-mail-btn"
                >
                  <ExternalLink size={17} />
                  <span>{isGmail ? 'Open Gmail' : 'Open Email App'}</span>
                </a>
              </div>
            )}

            {/* FEEDBACK NOTICE IF ANY */}
            {message && statusType !== 'info' && (
              <div className={`verify-feedback-banner ${statusType}`}>
                {statusType === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{message}</span>
              </div>
            )}

            {/* SECONDARY CARD: RESEND WITH 60-SEC COOLDOWN (PREVENTS ACCIDENTAL CLICKING) */}
            <div className="verify-secondary-card">
              <div className="secondary-card-header">
                <strong>Didn't receive the email?</strong>
                <p>Check your spam folder first, or request another link below.</p>
              </div>

              {showEditEmail ? (
                <form onSubmit={handleResend} className="verify-edit-email-form">
                  <label>
                    Send to email:
                    <input
                      type="email"
                      required
                      value={editEmailValue}
                      onChange={(e) => setEditEmailValue(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </label>
                  <div className="edit-email-buttons">
                    <button
                      type="submit"
                      disabled={busy}
                      className="verify-resend-action-btn"
                    >
                      {busy ? 'Sending…' : 'Send verification email'}
                    </button>
                    {email && (
                      <button
                        type="button"
                        className="cancel-edit-btn"
                        onClick={() => {
                          setEditEmailValue(email);
                          setShowEditEmail(false);
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="resend-buttons-row">
                  <button
                    type="button"
                    className="verify-resend-action-btn"
                    disabled={busy || (resendCooldown > 0 && !isExpired)}
                    onClick={() => handleResend()}
                  >
                    <RefreshCw size={14} className={busy ? 'rotating' : ''} />
                    <span>
                      {busy ? (
                        'Sending…'
                      ) : resendCooldown > 0 && !isExpired ? (
                        `Resend email in ${resendCooldown}s`
                      ) : (
                        'Resend verification email'
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="change-email-toggle-btn"
                    onClick={() => {
                      setEditEmailValue(email);
                      setShowEditEmail(true);
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Wrong email?</span>
                  </button>
                </div>
              )}
            </div>

            <div className="verify-footer-nav">
              <Link to="/login" className="verify-back-link">
                <ArrowLeft size={14} />
                <span>Back to sign in</span>
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
