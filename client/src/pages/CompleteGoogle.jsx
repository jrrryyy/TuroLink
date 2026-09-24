import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import FieldError from '../components/FieldError';
import '../styles/auth-security.css';
import '../styles/validation.css';
export default function CompleteGoogle() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', role: 'student', terms: false, verificationConsent: false, degreeTitle: '', subjectToTeach: '', teachingBio: '', password: '' });
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  useEffect(() => {
    let active = true;
    api.get('/auth/google/profile').then(({ data }) => { if (active) { setProfile(data); setForm(f => ({ ...f, name: data.name })); } }).catch(error => { if (active) setMessage(error.response?.data?.message || 'Unable to load Google profile.'); });
    return () => { active = false; };
  }, []);
  const change = e => { const { name, value, type, checked } = e.target; setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value })); setErrors(previous => ({ ...previous, [name]: undefined })); };
  const submit = async e => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const { data } = await api.post('/auth/google/complete', form);
      if (data.user) { updateUser(data.user); navigate(data.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard'); }
      else navigate('/verify-email', { state: { email: profile.email, message: data.message } });
    } catch (error) {
      if (error.response?.data?.code === 'EMAIL_UNVERIFIED' || error.response?.data?.verificationRequired) navigate('/verify-email', { state: { email: profile.email } });
      else { setMessage(error.response?.data?.message || 'Unable to save. Please try again.'); setErrors(error.response?.data?.errors || {}); }
    } finally { setBusy(false); }
  };
  return <main className="security-page"><section className="security-card"><Link to="/" className="security-brand">TuroLink</Link><h1>{profile?.linkRequired ? 'Link your Google account' : 'Complete your profile'}</h1>
    {message && <p role="alert">{message}</p>}
    {profile && <><p>{profile.email}</p><form onSubmit={submit}>
      {profile.linkRequired ? <><p>This email already has a TuroLink account. Confirm your existing password to connect Google securely.</p><label>Current TuroLink password<input name="password" type="password" autoComplete="current-password" required value={form.password} onChange={change} /></label></> : <>
        <label>Name<input required name="name" autoComplete="name" maxLength={100} value={form.name} onChange={change} /><FieldError errors={errors} name="name" /></label>
        <label>Mobile number<input required name="phone" type="tel" autoComplete="tel" placeholder="09XXXXXXXXX" value={form.phone} onChange={change} /><FieldError errors={errors} name="phone" /></label>
        <label>Join as<select name="role" value={form.role} onChange={change}><option value="student">Student</option><option value="teacher">Teacher</option></select></label>
        {form.role === 'teacher' && <>{[['degreeTitle', 'Degree title'], ['subjectToTeach', 'Subject to teach'], ['teachingBio', 'Teaching bio']].map(([name, label]) => <label key={name}>{label}<input required name={name} maxLength={name === 'teachingBio' ? 2000 : 200} value={form[name]} onChange={change} /><FieldError errors={errors} name={name} /></label>)}<label className="security-check"><input required type="checkbox" name="verificationConsent" checked={form.verificationConsent} onChange={change} />I confirm my teaching information is accurate.</label></>}
        <label className="security-check"><input required type="checkbox" name="terms" checked={form.terms} onChange={change} />I agree to the Terms and Conditions and Privacy Policy.</label>
        <p>We will send you a verification link. Verify your email before signing in.</p>
      </>}
      <button disabled={busy}>{busy ? 'Please wait…' : profile.linkRequired ? 'Confirm and connect Google' : 'Create account and verify email'}</button>
    </form></>}
    <Link to="/login">Back to sign in</Link>
  </section></main>;
}
