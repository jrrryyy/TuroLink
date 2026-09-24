import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/auth-security.css';
let scriptPromise;
function loadGoogle() {
  if (window.google?.accounts) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { script.remove(); scriptPromise = null; reject(new Error('Google could not load. Check your connection and reload.')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
export default function GoogleSignIn() {
  const target = useRef(null);
  const [message, setMessage] = useState('Loading Google sign-in…');
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const callbackRef = useRef();
  useEffect(() => {
    callbackRef.current = async ({ credential }) => {
      setMessage('Verifying your Google account…');
      try {
        const { data } = await api.post('/auth/google', { credential });
        if (data.needsProfile) navigate('/complete-google');
        else { updateUser(data.user); navigate(data.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard'); }
      } catch (error) {
        if (error.response?.data?.code === 'EMAIL_UNVERIFIED') navigate('/verify-email', { state: { email: error.response.data.email } });
        else setMessage(error.response?.data?.message || 'Unable to use Google sign-in. Please reload and try again.');
      }
    };
  }, [navigate, updateUser]);
  useEffect(() => {
    let active = true;
    api.get('/auth/google/config').then(async ({ data }) => {
      if (!active) return;
      if (!data.enabled) { setMessage('Google sign-in is not available yet. Please use email.'); return; }
      await loadGoogle();
      if (!active) return;
      window.google.accounts.id.initialize({ client_id: data.clientId, nonce: data.nonce, callback: result => callbackRef.current(result), auto_select: false });
      window.google.accounts.id.renderButton(target.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill' });
      setMessage('');
    }).catch(() => { if (active) setMessage('Google sign-in is unavailable. Please use email or reload.'); });
    return () => { active = false; };
  }, []);
  return <div className="google-sign-in"><div ref={target} />{message && <p role="status">{message}</p>}<div className="auth-divider">or continue with email</div></div>;
}
