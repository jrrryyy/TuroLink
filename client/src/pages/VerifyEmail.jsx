import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import '../styles/auth-security.css';
export default function VerifyEmail() {
  const location = useLocation();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '');
  const [email, setEmail] = useState(location.state?.email || '');
  const [message, setMessage] = useState(location.state?.message || 'Check your inbox and spam folder for your verification link.');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const submit = async (event, verify) => {
    event.preventDefault();
    if (busy) return;
    if (!verify && Date.now() < resendAt) { setMessage('Please wait 60 seconds before requesting another email.'); return; }
    setBusy(true);
    try {
      const { data } = await api.post(verify ? '/auth/verify-email' : '/auth/resend-verification', verify ? { token } : { email });
      setMessage(data.message);
      if (verify) { setVerified(true); window.history.replaceState(null, '', location.pathname); }
      else setResendAt(Date.now() + 60000);
    } catch (error) { setMessage(error.response?.data?.message || 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  };
  return <main className="security-page"><section className="security-card"><Link to="/" className="security-brand">TuroLink</Link><h1>{verified ? 'Email verified' : 'Verify your email'}</h1><p role="status">{message}</p>
    {token && !verified && <form onSubmit={e => submit(e, true)}><button disabled={busy}>{busy ? 'Verifying…' : 'Verify my email'}</button></form>}
    {!verified && <form onSubmit={e => submit(e, false)}><label>Email address<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label><button disabled={busy}>{busy ? 'Please wait…' : 'Resend verification email'}</button></form>}
    <Link to="/login">Back to sign in</Link>
  </section></main>;
}
