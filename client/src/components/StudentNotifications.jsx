import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/notifications.css';
const key = id => `turolink-notifications:${id}`;
const supported = () => 'Notification' in window && window.isSecureContext;
function preference(id) { try { return localStorage.getItem(key(id)) || 'ask'; } catch { return 'ask'; } }
function savePreference(id, value) { try { localStorage.setItem(key(id), value); } catch { /* Storage may be disabled. */ } window.dispatchEvent(new Event('turolink:notification-preference')); }
export function NotificationPreferences() {
  const { user } = useAuth();
  const [value, setValue] = useState(() => preference(user.id));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { const sync = () => setValue(preference(user.id)); window.addEventListener('turolink:notification-preference', sync); return () => window.removeEventListener('turolink:notification-preference', sync); }, [user.id]);
  const enable = async () => {
    if (!supported()) { setMessage('Browser alerts are unavailable here. Your notifications still appear in the bell.'); return; }
    setBusy(true);
    try {
      const permission = await window.Notification.requestPermission();
      savePreference(user.id, permission === 'granted' ? 'enabled' : 'off');
      setMessage(permission === 'granted' ? 'Browser alerts enabled while TuroLink is open.' : 'Browser alerts are off. You can change permission in your browser site settings.');
    } catch { setMessage('Unable to enable browser alerts. You can still use the notification bell.'); }
    finally { setBusy(false); }
  };
  return <section className="notification-preferences" aria-label="Notification preferences"><strong>Browser notifications</strong><p>{user.role === 'teacher' ? 'Get alerts for tutoring requests, student comments, and reviews while TuroLink is open.' : 'Get alerts for announcements, materials, and tutoring decisions while TuroLink is open.'} The bell works even when browser alerts are off.</p>
    {value === 'enabled' && supported() && window.Notification.permission === 'granted' ? <button type="button" onClick={() => savePreference(user.id, 'off')}>Turn off browser alerts</button> : <><button type="button" disabled={busy} onClick={enable}>{busy ? 'Waiting for permission…' : 'Enable notifications'}</button>{value === 'ask' && <button type="button" onClick={() => savePreference(user.id, 'off')}>Not now</button>}</>}
    {message && <p role="status">{message}</p>}
  </section>;
}
export default function StudentNotifications() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unreadCount: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const wrapper = useRef(null);
  const bell = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true; let timer;
    const poll = async () => {
      try {
        const response = await api.get('/notifications');
        if (!active) return;
        setData(response.data); setError('');
        const storageKey = `${key(user.id)}:seen`;
        let seen;
        try { seen = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { seen = null; }
        const ids = response.data.items.map(n => n._id);
        if (Array.isArray(seen) && preference(user.id) === 'enabled' && supported() && window.Notification.permission === 'granted') {
          for (const item of response.data.items.filter(n => !n.readAt && !seen.includes(n._id)).slice(0, 3)) {
            try {
              const alert = new window.Notification(item.title, { body: item.message, tag: item._id });
              alert.onclick = () => { window.focus(); api.patch(`/notifications/${item._id}/read`).catch(() => {}); navigate(item.url); alert.close(); };
            } catch { /* In-app alerts still work on browsers requiring push support. */ }
          }
        }
        try { localStorage.setItem(storageKey, JSON.stringify([...new Set([...(Array.isArray(seen) ? seen : []), ...ids])].slice(-500))); } catch { /* In-app history remains available. */ }
      } catch { if (active) setError('Unable to load notifications. Please try again.'); }
      finally { if (active) { setLoading(false); timer = setTimeout(poll, 30000); } }
    };
    poll(); return () => { active = false; clearTimeout(timer); };
  }, [user.id, navigate, revision]);
  useEffect(() => {
    if (!open) return;
    const close = e => { if (!wrapper.current?.contains(e.target)) setOpen(false); };
    const escape = e => { if (e.key === 'Escape') { setOpen(false); bell.current?.focus(); } };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  const read = async item => {
    setBusy(true);
    try { await api.patch(item ? `/notifications/${item._id}/read` : '/notifications/read-all'); setRevision(v => v + 1); if (item) { setOpen(false); navigate(item.url); } }
    catch { setError('Unable to update notifications. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="student-notifications" ref={wrapper}><button type="button" className="notification-bell" ref={bell} aria-label={`Notifications${data.unreadCount ? `, ${data.unreadCount} unread` : ''}`} aria-expanded={open} aria-controls="student-notification-panel" onClick={() => setOpen(v => !v)}><Bell size={23} />{data.unreadCount > 0 && <span className="notification-badge">{data.unreadCount > 99 ? '99+' : data.unreadCount}</span>}</button>
    {open && <section className="notification-panel" id="student-notification-panel" aria-label={`${user.role === 'teacher' ? 'Teacher' : 'Student'} notifications`}><header><h2>Notifications</h2><button type="button" aria-label="Close notifications" onClick={() => { setOpen(false); bell.current?.focus(); }}><X size={18} /></button></header>
      <NotificationPreferences />
      <button type="button" className="notification-read-all" disabled={busy || !data.unreadCount} onClick={() => read()}>Mark all as read</button>
      {error && <p role="alert">{error} <button type="button" onClick={() => setRevision(v => v + 1)}>Retry</button></p>}
      {loading ? <p role="status">Loading notifications…</p> : !data.items.length ? <div className="notification-empty"><Bell size={30} /><strong>You’re all caught up</strong><p>{user.role === 'teacher' ? 'New student requests, comments, and reviews will appear here.' : 'Updates from your subjects and tutors will appear here.'}</p></div> : <ul>{data.items.map(item => <li key={item._id}><button type="button" disabled={busy} className={`notification-item ${item.readAt ? '' : 'unread'}`} onClick={() => read(item)}><strong>{!item.readAt && <span className="notification-dot" aria-label="Unread" />}{item.title}</strong><span>{item.message}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</time></button></li>)}</ul>}
      <small>Showing the latest 50 notifications.</small>
    </section>}
  </div>;
}
