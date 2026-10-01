import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { normalizeEmail } from '../../../shared/validation.mjs';
import '../styles/auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState(() => localStorage.getItem('turolink_remembered_email') || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setMessage('');

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post('/auth/forgot-password', { email: cleanEmail });
      setMessage(data.message || 'If an account exists with this email, a reset link has been sent.');
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to process your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-brand-panel">
        <Link to="/login" className="auth-back">
          <ArrowLeft size={18} />
          Back to Login
        </Link>

        <div className="auth-brand-content">
          <h1>TuroLink</h1>
          <p>
            Account Recovery.
            <br />
            Securely regain access to your account.
          </p>
        </div>

        <div className="auth-decoration">
          <div className="auth-circle-one"></div>
          <div className="auth-circle-two"></div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container login-container">
          <div className="auth-heading">
            <span className="section-label">PASSWORD RECOVERY</span>
            <h2>Forgot Password?</h2>
            <p>
              Enter your registered email address and we'll send you a secure link to reset your password.
            </p>
          </div>

          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}

          {isSuccess ? (
            <div style={{
              background: 'rgba(51, 80, 53, 0.08)',
              border: '1px solid rgba(51, 80, 53, 0.25)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              margin: '20px 0',
            }}>
              <CheckCircle2 size={44} style={{ color: '#335035', margin: '0 auto 12px' }} />
              <h3 style={{ color: '#335035', fontSize: '1.2rem', marginBottom: '8px' }}>
                Instructions Sent
              </h3>
              <p style={{ color: '#526b53', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                {message}
              </p>

              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  to="/login"
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', display: 'block', textAlign: 'center', padding: '12px' }}
                >
                  Return to Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => { setIsSuccess(false); setMessage(''); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#335035',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Try another email address
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <label>
                Email Address
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                />
              </label>

              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={loading}
              >
                {loading ? 'Sending Link...' : 'Send Reset Link'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <Link
                  to="/login"
                  style={{
                    color: '#335035',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Remember your password? <strong>Sign In</strong>
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
