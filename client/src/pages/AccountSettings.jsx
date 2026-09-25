import PasswordStrength from '../components/PasswordStrength';
import { NotificationPreferences } from '../components/StudentNotifications';
import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Pencil } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import FieldError from '../components/FieldError';
import { useAuth } from '../context/AuthContext';
import { validateProfile } from '../../../shared/validation.mjs';
import api from '../services/api';
import { profilePictureUrl } from '../services/profile';
import '../styles/account-settings.css';
import '../styles/validation.css';

export default function AccountSettings() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState(() => ({ name: user.name, bio: user.bio || '', sex: user.sex || '', currentPassword: '', newPassword: '', confirmPassword: '' }));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [removePicture, setRemovePicture] = useState(false);
  const [visible, setVisible] = useState({});
  const submitting = useRef(false);
  const fileInput = useRef(null);
  const formRef = useRef(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const change = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setMessage('');
  };
  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const error = file.size > 2 * 1024 * 1024 ? 'Choose an image of 2 MB or smaller.' : !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? 'Choose a JPG, PNG, or WebP image.' : '';
    setErrors((previous) => ({ ...previous, profilePicture: error }));
    if (error) { event.target.value = ''; return; }
    setPhoto(file); setPreview(URL.createObjectURL(file)); setRemovePicture(false); setMessage('');
  };
  const save = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    const validation = validateProfile(form);
    if (errors.profilePicture) validation.profilePicture = errors.profilePicture;
    setErrors(validation); setMessage(''); setSuccess(false);
    if (Object.keys(validation).length) {
      formRef.current.elements.namedItem(Object.keys(validation)[0])?.focus(); return;
    }
    submitting.current = true; setBusy(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      if (photo) body.append('profilePicture', photo);
      body.append('removePicture', String(removePicture));
      const response = await api.put('/auth/me', body);
      updateUser(response.data.user);
      setForm({ name: response.data.user.name, bio: response.data.user.bio, sex: response.data.user.sex, currentPassword: '', newPassword: '', confirmPassword: '' });
      setPhoto(null); setPreview(''); setRemovePicture(false); setVisible({}); fileInput.current.value = '';
      setSuccess(true); setMessage('Changes saved successfully.');
    } catch (error) {
      setErrors(error.response?.data?.errors || {});
      setMessage(error.response?.data?.message || 'Unable to save changes. Check your connection and try again.');
    } finally { submitting.current = false; setBusy(false); }
  };
  const image = photo ? preview : removePicture ? '' : profilePictureUrl(user.profilePicture);
  return <DashboardLayout role={user.role} userName={user.name}>
    <div className="account-settings-wrap">
      <form className="account-settings-card" ref={formRef} noValidate onSubmit={save}>
        <h1>Settings &amp; Preferences</h1>
        {message && <div className={success ? 'account-feedback success' : 'account-feedback'} role={success ? 'status' : 'alert'}>{message}</div>}
        <fieldset disabled={busy}>
          <div className="account-profile-grid">
            <div className="account-profile-fields">
              <label>Name<input name="name" autoComplete="name" maxLength={100} value={form.name} onChange={change} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} /><FieldError errors={errors} name="name" /></label>
              <label>Bio<textarea name="bio" rows={4} maxLength={2000} placeholder="Tell us a little bit about yourself" value={form.bio} onChange={change} aria-invalid={Boolean(errors.bio)} aria-describedby={errors.bio ? 'bio-error' : undefined} /><FieldError errors={errors} name="bio" /></label>
              <label>Sex<select name="sex" aria-label="Sex" value={form.sex} onChange={change} aria-invalid={Boolean(errors.sex)} aria-describedby={errors.sex ? 'sex-error' : undefined}><option value="">Select an option</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer-not-to-say">Prefer not to say</option></select><FieldError errors={errors} name="sex" /></label>
              <section className="account-details" aria-labelledby="account-details-heading"><h2 id="account-details-heading">Account</h2><div className="account-details-table"><div>Account Details</div><p>{user.email}</p><p>Password: <span aria-label="Password hidden">••••••••••••</span></p></div></section>
            </div>
            <div className="account-picture">
              <h2>Profile Picture</h2>
              <div className="account-picture-circle">{image ? <img src={image} alt="Profile preview" /> : <span>{form.name?.trim().charAt(0).toUpperCase() || 'U'}</span>}</div>
              <label className="account-picture-edit"><Pencil size={15} />Edit<input ref={fileInput} type="file" name="profilePicture" accept="image/jpeg,image/png,image/webp" aria-label="Edit profile picture" onChange={choosePhoto} aria-invalid={Boolean(errors.profilePicture)} aria-describedby="profile-picture-help" /></label>
              <p id="profile-picture-help">JPG, PNG, or WebP · Up to 2 MB</p>
              <FieldError errors={errors} name="profilePicture" />
              {(photo || user.profilePicture || errors.profilePicture) && <button type="button" className="account-text-button" onClick={() => { setPhoto(null); setPreview(''); setRemovePicture(true); fileInput.current.value = ''; setErrors((previous) => ({ ...previous, profilePicture: undefined })); }}>Remove photo</button>}
            </div>
          </div>
          <section className="account-security" aria-label="Password and contact information">
            <div><h2>Change Password</h2><p className="account-hint">Leave these fields blank to keep your current password.</p>
              {(user.hasPassword ? [['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm New Password']] : []).map(([name, label]) => <label key={name}>{label}<div className="account-password"><input name={name} type={visible[name] ? 'text' : 'password'} autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'} value={form[name]} onChange={change} placeholder={label} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} /><button type="button" aria-label={`${visible[name] ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setVisible((previous) => ({ ...previous, [name]: !previous[name] }))}>{visible[name] ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><FieldError errors={errors} name={name} />{name === "newPassword" && <PasswordStrength value={form.newPassword} />}</label>)}{!user.hasPassword && <p>You sign in with Google. Manage your password in your Google account.</p>}
            </div>
            <dl><dt>Contact Number</dt><dd>{user.phone || 'Not provided'}</dd><dt>Role</dt><dd>{user.role === 'teacher' ? 'Teacher' : 'Student'}</dd></dl>
          </section>
          <NotificationPreferences />
          <button type="submit" className="account-save">{busy ? 'Saving...' : 'Save Changes'}</button>
        </fieldset>
      </form>
    </div>
  </DashboardLayout>;
}
