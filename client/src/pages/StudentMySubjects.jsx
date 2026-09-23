import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Download, Heart, MessageSquare } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { profilePictureUrl } from '../services/profile';
import { downloadFile } from '../services/download';
import '../styles/student-subject-feed.css';

const date = (value) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
function Avatar({ subject }) {
  return <span className="subject-feed-avatar">{subject.instructorAvatar ? <img src={profilePictureUrl(subject.instructorAvatar)} alt="" /> : subject.instructorName?.charAt(0) || 'T'}</span>;
}
function Attachment({ endpoint, name }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div><button type="button" className="subject-feed-download" disabled={busy} onClick={async () => {
    setBusy(true); setError('');
    try { await downloadFile(endpoint, name); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }}><Download size={16} />{busy ? 'Downloading…' : name}</button>{error && <p role="alert" className="subject-feed-error">{error}</p>}</div>;
}
function Announcement({ subject, post, reload }) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mutate = async (fn, clear = false) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await fn(); if (clear) setComment(''); await reload(); }
    catch (e) { setError(e.response?.data?.message || 'Unable to save. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const endpoint = `/student-subjects/${subject._id}/announcements/${post._id}`;
  return <article className="subject-feed-post"><header><Avatar subject={subject} /><div><strong>{subject.instructorName}</strong><small>Lead Instructor</small></div><time dateTime={post.postedAt}>{date(post.postedAt)}</time></header>
    <p className="subject-feed-content">{post.content}</p>
    {post.link && <p><a href={post.link} target="_blank" rel="noreferrer">Open announcement link</a></p>}
    {post.attachmentName && <Attachment name={post.attachmentName} endpoint={`${endpoint}/attachment`} />}
    <footer><button type="button" disabled={busy} aria-pressed={post.liked} onClick={() => mutate(() => api.put(`${endpoint}/like`, { liked: !post.liked }))}><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} />{post.likes} {post.likes === 1 ? 'Like' : 'Likes'}</button><button type="button" aria-expanded={expanded} aria-controls={`comments-${post._id}`} onClick={() => setExpanded(!expanded)}><MessageSquare size={17} />{post.comments.length} Comments</button></footer>
    {error && <p className="subject-feed-error" role="alert">{error}</p>}
    {expanded && <section id={`comments-${post._id}`} className="subject-feed-comments" aria-label="Comments">
      {!post.comments.length && <p className="subject-feed-muted">Be the first to comment.</p>}
      {post.comments.map((c) => <article key={c._id}><strong>{c.name}{c.own ? ' (you)' : ''}</strong><small>{date(c.createdAt)}</small><p>{c.text}</p></article>)}
      <form onSubmit={(e) => { e.preventDefault(); if (!comment.trim()) { setError('Enter a comment before posting.'); return; } mutate(() => api.post(`${endpoint}/comments`, { text: comment }), true); }}><label>Your comment<textarea maxLength={2000} required value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" /></label><button className="subject-feed-primary" disabled={busy}>{busy ? 'Saving…' : 'Post Comment'}</button></form>
    </section>}
  </article>;
}
export default function StudentMySubjects() {
  const { user } = useAuth();
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'materials' ? 'materials' : 'announcements';
  const setTab = (value) => setSearchParams(value === 'materials' ? { tab: value } : {});
  const endpoint = id ? `/student-subjects/${id}` : '/student-subjects';
  useEffect(() => {
    let active = true;
    api.get(endpoint).then((response) => { if (active) { setResult({ endpoint, data: response.data }); setError(''); } })
      .catch((e) => { if (active) setError(e.response?.data?.message || 'Unable to load subjects. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint, revision]);
  const reload = async () => { const response = await api.get(endpoint); setResult({ endpoint, data: response.data }); };
  const data = result?.endpoint === endpoint ? result.data : null;
  const filtered = Array.isArray(data) ? data.filter((s) => `${s.code} ${s.title} ${s.instructorName} ${s.upcomingTopic}`.toLowerCase().includes(query.toLowerCase().trim())) : [];
  return <DashboardLayout role="student" userName={user.name} searchValue={query} onSearchChange={setQuery} searchPlaceholder="Search your subjects…"><div className="subject-feed-page">
    {id && <Link className="subject-feed-back" to="/student/my-subjects"><ArrowLeft size={16} />Back to My Subjects</Link>}
    {error ? <div className="subject-feed-error" role="alert">{error} <button onClick={() => { setError(''); setLoading(true); setRevision((r) => r + 1); }}>Try again</button></div> : (loading || !data) && <p role="status">Loading subjects…</p>}
    {!id && data && <><h1>My Subjects</h1><div className="subject-feed-grid">{filtered.map((s) => <article className="subject-feed-card" key={s._id}><header><Avatar subject={s} /><div><strong>{s.instructorName}</strong><small>{s.title}</small></div></header><div className="subject-feed-card-body"><span>Upcoming topic:</span><p>{s.upcomingTopic || 'No upcoming topic yet'}</p></div><Link className="subject-feed-primary" to={`/student/my-subjects/${s._id}`}>View Announcements</Link></article>)}</div>
      {!filtered.length && <div className="subject-feed-empty"><BookOpen size={36} /><h2>{query ? 'No matching subjects' : 'No enrolled subjects yet'}</h2><p>{query ? 'Try a different subject or teacher name.' : 'Choose a subject when requesting a tutor. It appears here after the teacher accepts.'}</p><Link to="/student/find-tutors">Find a tutor</Link></div>}</>}
    {id && data && <><h1>{data.code}: {data.title}</h1><p className="subject-feed-muted">Enrolled Students: {data.enrolledCount} · Subject Rating: {data.rating ? `${data.rating}/5` : 'Not rated yet'}</p><nav className="subject-feed-tabs" aria-label="Subject content"><button aria-pressed={tab === 'announcements'} className={tab === 'announcements' ? 'active' : ''} onClick={() => setTab('announcements')}>Announcements</button><button aria-pressed={tab === 'materials'} className={tab === 'materials' ? 'active' : ''} onClick={() => setTab('materials')}>Materials</button></nav>
      {tab === 'announcements' ? <>{!data.announcements.length && <div className="subject-feed-empty">No announcements posted yet.</div>}{data.announcements.map((p) => <Announcement key={p._id} subject={data} post={p} reload={reload} />)}</> : <>{!data.materials.length && <div className="subject-feed-empty">No materials published yet.</div>}{data.materials.map((m) => <article className="subject-feed-post" key={m._id}><small>{m.type === 'quiz' ? 'Quiz Assignment' : 'Assignment'}</small><h2>{m.title}</h2><p className="subject-feed-muted">{m.points == null ? 'Ungraded' : `${m.points} points`}{m.dueAt ? ` · Due ${date(m.dueAt)} (Manila)` : ' · No due date'}</p><p className="subject-feed-content">{m.instructions}</p>{m.link && <p><a href={m.link} target="_blank" rel="noreferrer">Open material link</a></p>}{m.attachmentName && <Attachment name={m.attachmentName} endpoint={`/student-subjects/${id}/materials/${m._id}/attachment`} />}</article>)}</>}
    </>}
  </div></DashboardLayout>;
}
