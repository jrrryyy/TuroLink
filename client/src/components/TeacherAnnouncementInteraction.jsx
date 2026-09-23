import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import api from '../services/api';
import '../styles/announcement-interaction.css';

export default function TeacherAnnouncementInteraction({ subjectId, announcementId }) {
  const endpoint = `/subjects/${subjectId}/announcements/${announcementId}`;
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    api.get(`${endpoint}/engagement`).then((r) => { if (active) { setData(r.data); setError(''); } }).catch(() => { if (active) setError('Unable to load likes and comments.'); });
    return () => { active = false; };
  }, [endpoint, revision]);
  const refresh = async () => { const r = await api.get(`${endpoint}/engagement`); setData(r.data); };
  const save = async (comment = false) => {
    if (lock.current) return;
    if (comment && !text.trim()) { setError('Enter a comment before posting.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      if (comment) { await api.post(`${endpoint}/comments`, { text }); setText(''); }
      else await api.put(`${endpoint}/like`, { liked: !data.liked });
      await refresh();
    } catch (e) { setError(e.response?.data?.message || 'Unable to save. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section className="announcement-interaction">
    <div className="teacher-announcement-footer">
      <button type="button" disabled={!data || busy} aria-pressed={data?.liked || false} onClick={() => save()}><Heart size={17} fill={data?.liked ? 'currentColor' : 'none'} />{data ? `${data.likes} ${data.likes === 1 ? 'Like' : 'Likes'}` : 'Loading likes…'}</button>
      <button type="button" disabled={!data} aria-expanded={expanded} onClick={() => { setExpanded(!expanded); if (!expanded) setRevision((n) => n + 1); }}><MessageCircle size={17} />{data ? `${data.comments.length} Comments` : 'Loading comments…'}</button>
    </div>
    {error && <p role="alert">{error} <button type="button" onClick={() => setRevision((n) => n + 1)}>Refresh</button></p>}
    {expanded && data && <div className="announcement-comment-list">
      {!data.comments.length && <p>No comments yet.</p>}
      {data.comments.map((c) => <article key={c._id}><strong>{c.name}</strong><small>{new Date(c.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</small><p>{c.text}</p></article>)}
      <form onSubmit={(e) => { e.preventDefault(); save(true); }}><label>Your comment<textarea required maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} /></label><button disabled={busy} type="submit">{busy ? 'Saving…' : 'Post Comment'}</button></form>
    </div>}
  </section>;
}
