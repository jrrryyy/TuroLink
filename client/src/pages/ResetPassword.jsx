import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import api from '../services/api';
import PasswordStrength from '../components/PasswordStrength';
import '../styles/auth.css';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract token from hash (#token=...) or query string (?token=...)
  const [token] = useState(() => {
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (hashParams.get('token')) return hashParams.get('token');
    const queryParams = new URLSearchParams(location.search);
    return queryParams.get('token') || '';
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');

    if (!token) {
      setError('This password reset link is invalid or missing a security token.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/reset-password', {
        token,
        password,
        confirmPassword,
      });
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset your password. Please try again.');
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
            Set New Password.
            <br />
            Create a secure password to protect your account.
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
            <span className="section-label">ACCOUNT SECURITY</span>
            <h2>Reset Password</h2>
            <p>
              Please enter and confirm your new account password below.
            </p>
          </div>

          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}

          {!token ? (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              margin: '20px 0',
            }}>
              <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
              <h3 style={{ color: '#ef4444', fontSize: '1.15rem', marginBottom: '8px' }}>
                Invalid Reset Link
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 16px' }}>
                This password reset link is missing a valid security token or has expired. Please request a new link.
              </p>
              <Link
                to="/forgot-password"
                className="btn btn-primary"
                style={{ textDecoration: 'none', display: 'inline-block', padding: '10px 20px' }}
              >
                Request New Reset Link
              </Link>
            </div>
          ) : isSuccess ? (
            <div style={{
              background: 'rgba(51, 80, 53, 0.08)',
              border: '1px solid rgba(51, 80, 53, 0.25)',
              borderRadius: '16px',
              padding: '28px',
              textAlign: 'center',
              margin: '20px 0',
            }}>
              <CheckCircle2 size={48} style={{ color: '#335035', margin: '0 auto 14px' }} />
              <h3 style={{ color: '#335035', fontSize: '1.25rem', marginBottom: '8px' }}>
                Password Reset Successfully!
              </h3>
              <p style={{ color: '#526b53', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 20px' }}>
                Your password has been updated and all prior sessions have been secured. You can now log in with your new credentials.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
                onClick={() => navigate('/login')}
              >
                Proceed to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <label>
                New Password
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min. 6 characters)"
                    name="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </label>

              <PasswordStrength value={password} />

              <label>
                Confirm New Password
                <div className="password-field">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={loading}
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
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
                  Cancel and return to <strong>Sign In</strong>
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
