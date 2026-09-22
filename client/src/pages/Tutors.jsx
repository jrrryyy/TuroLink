import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, Star } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { profilePictureUrl } from '../services/profile';
import '../styles/tutors.css';

const money = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
const dayKey = (value) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const time = (value) => new Date(value).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });
const dateLabel = (value) => new Date(value).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
function useData(path) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => { setLoading(true); setError(''); setRevision((n) => n + 1); }, []);
  useEffect(() => {
    let cancelled = false;
    api.get(path).then((response) => { if (!cancelled) setResult({ path, value: response.data }); })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.message || 'Unable to load. Please try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [path, revision]);
  return { data: result?.path === path ? result.value : null, error, loading, reload };
}
function Status({ state }) {
  return <>{state.loading && <p role="status">Loading…</p>}{state.error && <div className="tutor-alert" role="alert">{state.error} <button onClick={state.reload}>Try again</button></div>}</>;
}
function Shell({ children }) {
  const { user } = useAuth();
  return <DashboardLayout role={user.role} userName={user.name}><div className="tutors-page">{children}</div></DashboardLayout>;
}
function Avatar({ tutor }) {
  return <div className="tutor-avatar">{tutor.profilePicture ? <img src={profilePictureUrl(tutor.profilePicture)} alt="" /> : tutor.name?.charAt(0)}</div>;
}
function Rating({ tutor }) {
  return <span className="tutor-rating"><Star size={14} /> {tutor.totalRatings ? `${tutor.averageRating.toFixed(1)} · ${tutor.totalRatings} review${tutor.totalRatings === 1 ? '' : 's'}` : 'No reviews yet'}</span>;
}
function availabilityTags(slots) {
  const tags = new Set();
  slots.forEach((slot) => {
    const local = new Date(new Date(slot.start).getTime() + 8 * 3600000);
    tags.add(local.getUTCDay() === 0 || local.getUTCDay() === 6 ? 'Weekends' : 'Weekdays');
    tags.add(local.getUTCHours() < 12 ? 'Mornings' : local.getUTCHours() < 18 ? 'Afternoons' : 'Evenings');
  });
  return [...tags];
}

export function FindTutors() {
  const state = useData('/tutors');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [availability, setAvailability] = useState('');
  const [rating, setRating] = useState('');
  const tutors = state.data || [];
  const filtered = tutors.filter((t) => `${t.name} ${t.subject}`.toLowerCase().includes(query.trim().toLowerCase()) && (!subject || t.subject === subject) && (!availability || availabilityTags(t.slots).includes(availability)) && (!rating || (t.totalRatings > 0 && t.averageRating >= Number(rating))));
  return <Shell><section className="tutor-panel"><h1>Find Tutors</h1><p className="tutor-muted">Search by tutor name or subject, then find a time that fits your schedule.</p>
    <label className="tutor-search"><Search size={18} /><input aria-label="Search tutors by name or subject" placeholder="Search tutors by name or subject" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
    <div className="tutor-filters">
      <select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}><option value="">All subjects</option>{[...new Set(tutors.map((t) => t.subject))].sort().map((s) => <option key={s}>{s}</option>)}</select>
      <select aria-label="Availability" value={availability} onChange={(e) => setAvailability(e.target.value)}><option value="">Any availability</option>{['Weekdays', 'Weekends', 'Mornings', 'Afternoons', 'Evenings'].map((s) => <option key={s}>{s}</option>)}</select>
      <select aria-label="Rating" value={rating} onChange={(e) => setRating(e.target.value)}><option value="">All ratings</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option></select>
      <span className="tutor-count" role="status">{filtered.length} tutors found</span>
      {(query || subject || availability || rating) && <button className="tutor-secondary" onClick={() => { setQuery(''); setSubject(''); setAvailability(''); setRating(''); }}>Clear filters</button>}
    </div><Status state={state} />
    {!state.loading && !state.error && !filtered.length && <div className="tutor-empty">No tutors match yet. Try another subject or clear your filters.</div>}
    <div className="tutor-grid">{filtered.map((tutor) => <article className="tutor-card" key={tutor.id}><div className="tutor-identity"><Avatar tutor={tutor} /><div><h2>{tutor.name}</h2><p>{tutor.subject}</p><Rating tutor={tutor} /></div></div>
      <div className="tutor-tags">{availabilityTags(tutor.slots).map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="tutor-card-bottom"><div><small>Hourly rate</small><strong>{tutor.hourlyRate ? `${money(tutor.hourlyRate)}/hr` : 'Not set yet'}</strong></div><Link className="tutor-button" to={`/student/tutors/${tutor.id}`}>{tutor.hourlyRate && tutor.slots.length ? 'Book Now' : 'View Profile'}</Link></div>
      {!tutor.slots.length && <small className="tutor-muted">No available slots yet</small>}
    </article>)}</div>
  </section></Shell>;
}

function Calendar({ slots, selected, onSelect }) {
  const [month, setMonth] = useState(() => dayKey(slots[0]?.start || Date.now()).slice(0, 7));
  const [year, number] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const days = new Set(slots.map((s) => dayKey(s.start)));
  const move = (amount) => setMonth(new Date(Date.UTC(year, number - 1 + amount, 1)).toISOString().slice(0, 7));
  return <div className="tutor-calendar"><div className="tutor-calendar-heading"><strong>{first.toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong><button aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={17} /></button><button aria-label="Next month" onClick={() => move(1)}><ChevronRight size={17} /></button></div>
    <div className="tutor-calendar-grid">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <small key={d}>{d}</small>)}{Array.from({ length: first.getUTCDay() }, (_, i) => <span key={`blank${i}`} />)}{Array.from({ length: count }, (_, i) => { const key = `${month}-${String(i + 1).padStart(2, '0')}`; return <button key={key} disabled={!days.has(key)} className={selected === key ? 'selected' : ''} aria-label={key} aria-pressed={selected === key} onClick={() => onSelect(key)}>{i + 1}</button>; })}</div>
  </div>;
}
export function TutorDetails() {
  const { id } = useParams();
  const state = useData(`/tutors/${id}`);
  const [day, setDay] = useState('');
  const [slotId, setSlotId] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const tutor = state.data;
  const selected = tutor?.slots.find((s) => s._id === slotId);
  const book = async () => {
    if (!selected || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await api.post('/tutors/bookings', { slotId, expectedPrice: tutor.hourlyRate }); setNotice('Request sent! Waiting for teacher approval. Track its status in Schedules.'); setSlotId(''); await state.reload(); }
    catch (e) { setError(e.response?.data?.message || 'Booking failed. Check Schedules before retrying if your connection was interrupted.'); await state.reload(); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Shell><Link className="tutor-back" to="/student/find-tutors"><ArrowLeft size={16} />Back to Find Tutors</Link><Status state={state} />
    {notice && <div className="tutor-success" role="status">{notice} <Link to="/student/schedules">View schedules</Link></div>}{error && <p className="tutor-alert" role="alert">{error}</p>}
    {tutor && <div className="tutor-detail-grid"><div><section className="tutor-panel tutor-profile-heading"><Avatar tutor={tutor} /><div><h1>{tutor.name}</h1><p>{tutor.subject}</p><Rating tutor={tutor} /></div><strong>{tutor.hourlyRate ? `${money(tutor.hourlyRate)}/hr` : 'Rate not set'}</strong></section>
      <section className="tutor-panel"><h2>About {tutor.name.split(' ')[0]}</h2><p className="tutor-bio">{tutor.bio || 'This teacher has not added a bio yet.'}</p></section>
      <section className="tutor-panel"><h2>Student Reviews</h2>{!tutor.reviews.length && <p className="tutor-muted">No reviews yet. Students can review after their session ends.</p>}{tutor.reviews.map((r) => <article className="tutor-review" key={r.id}><div><strong>{r.name}</strong><span>★ {r.rating} · {dateLabel(r.createdAt)}</span></div><p>{r.text}</p></article>)}</section></div>
      <section className="tutor-panel tutor-booking"><h2>Book a Session</h2><p className="tutor-muted">One hour · Manila time (UTC+8)</p><Calendar slots={tutor.slots} selected={day} onSelect={(d) => { setDay(d); setSlotId(''); }} />
        <h3>{day ? `Available slots · ${day}` : 'Select an available date'}</h3><div className="tutor-slot-grid">{tutor.slots.filter((s) => dayKey(s.start) === day).map((s) => <button key={s._id} disabled={busy} className={slotId === s._id ? 'selected' : ''} aria-pressed={slotId === s._id} onClick={() => setSlotId(s._id)}>{time(s.start)}</button>)}</div>
        {!tutor.slots.length && <p className="tutor-muted">No available slots. Please check again later.</p>}
        {selected && <p>{dateLabel(selected.start)} · {time(selected.start)}–{time(new Date(new Date(selected.start).getTime() + 3600000))}</p>}
        <div className="tutor-total"><span>1 hour session</span><strong>{tutor.hourlyRate ? money(tutor.hourlyRate) : '—'}</strong><span>Platform fee</span><span>{money(0)}</span><strong>Total</strong><strong>{tutor.hourlyRate ? money(tutor.hourlyRate) : '—'}</strong></div>
        <p className="tutor-muted">Your teacher must accept this request before the session is confirmed. No online payment is collected.</p><button className="tutor-button" disabled={!selected || !tutor.hourlyRate || busy || state.loading || Boolean(state.error)} onClick={book}>{busy ? 'Sending…' : 'Send Tutoring Request'}</button>
      </section></div>}
  </Shell>;
}

export function TeacherAvailability() {
  const state = useData('/tutors/availability');
  const [today] = useState(() => dayKey(Date.now()));
  const [rate, setRate] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('09');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const action = async (fn, message) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice(''); setError('');
    try { await fn(); setNotice(message); await state.reload(); }
    catch (e) { setError(e.response?.data?.message || 'Unable to save. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Shell><section className="tutor-panel"><h1>Teaching Availability</h1><p className="tutor-muted">Set your hourly rate and publish one-hour slots. Student requests reserve these times until you accept or decline them in Request. All times use Manila time (UTC+8).</p><Status state={state} />
    {notice && <p className="tutor-success" role="status">{notice}</p>}{error && <p className="tutor-alert" role="alert">{error}</p>}
    <form className="tutor-inline-form" onSubmit={(e) => { e.preventDefault(); action(() => api.put('/tutors/availability/rate', { hourlyRate: Number(rate) }), 'Hourly rate saved. Existing bookings keep their original price.'); }}><label>Hourly rate (PHP)<input type="number" min="1" max="100000" step="0.01" required value={rate} placeholder={state.data?.hourlyRate || 'Enter rate'} onChange={(e) => setRate(e.target.value)} /></label><button className="tutor-button" disabled={busy}>Save Rate</button><span>Current rate: {state.data?.hourlyRate ? money(state.data.hourlyRate) : 'Not set'}</span></form>
    <form className="tutor-inline-form" onSubmit={(e) => { e.preventDefault(); action(() => api.post('/tutors/availability', { start: `${date}T${hour}:00:00+08:00` }), 'Available slot added.'); }}><label>Date<input type="date" required min={today} value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Start time<select value={hour} onChange={(e) => setHour(e.target.value)}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}:00</option>)}</select></label><button className="tutor-button" disabled={busy || !state.data?.hourlyRate}>Add Slot</button></form>
    <h2>Upcoming Availability</h2>{state.data && !state.data.slots.length && <p>No slots yet. Add your first available time above.</p>}
    <div className="tutor-schedule-list">{state.data?.slots.map((s) => <article className="tutor-schedule-row" key={s._id}><span>{dateLabel(s.start)} · {time(s.start)}–{time(new Date(new Date(s.start).getTime() + 3600000))}</span>{s.booked ? <span className="tutor-badge">Reserved</span> : <button className="tutor-secondary" disabled={busy} onClick={() => action(() => api.delete(`/tutors/availability/${s._id}`), 'Slot removed.')}>Remove</button>}</article>)}</div>
  </section></Shell>;
}

function ReviewForm({ booking, onSaved }) {
  const [rating, setRating] = useState('5');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <form className="tutor-review-form" onSubmit={async (e) => {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await api.post(`/tutors/bookings/${booking._id}/review`, { rating: Number(rating), text }); await onSaved(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to save review.'); }
    finally { setBusy(false); }
  }}><label>Rating<select aria-label="Rating" value={rating} onChange={(e) => setRating(e.target.value)}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select></label><label>Your review<textarea required maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="How was your session?" /></label>{error && <p role="alert" className="tutor-alert">{error}</p>}<button className="tutor-button" disabled={busy}>{busy ? 'Saving…' : 'Submit Review'}</button></form>;
}
export function TeacherRequests() {
  const state = useData('/tutors/requests');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const decide = async (id, action) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage(''); setError('');
    try { const response = await api.patch(`/tutors/requests/${id}`, { action }); setMessage(response.data.message); state.reload(); }
    catch (e) { setError(e.response?.data?.message || 'Unable to update the request. Please try again.'); state.reload(); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Shell><section className="tutor-panel"><h1>Tutoring Requests</h1><p className="tutor-muted">Review student requests below. Accept to confirm a session, or decline to release its time slot.</p>
    <Status state={state} />{message && <p role="status" className="tutor-success">{message}</p>}{error && <p role="alert" className="tutor-alert">{error}</p>}
    {!state.loading && !state.error && !state.data?.length && <div className="tutor-empty">No pending tutoring requests.</div>}
    {state.data?.map((request) => <article className="tutor-panel" key={request._id}><div className="tutor-schedule-row"><div><h2>{request.student?.name || 'Student'}</h2><p>{request.subject}</p><p>{dateLabel(request.start)} · {time(request.start)}–{time(request.end)} (Manila)</p><strong>{money(request.price)}</strong></div><span className="tutor-badge">Pending approval</span></div>
      {new Date(request.start) <= new Date() && <p className="tutor-muted">This time has passed. Please decline this request.</p>}
      <div className="tutor-tabs"><button className="tutor-button" disabled={busy || state.loading || new Date(request.start) <= new Date()} onClick={() => decide(request._id, 'accept')}>Accept</button><button className="tutor-secondary" disabled={busy || state.loading} onClick={() => decide(request._id, 'decline')}>Decline</button></div>
    </article>)}<Link className="tutor-back" to="/teacher/schedules">View schedules and request history</Link>
  </section></Shell>;
}
export function TutorSchedules({ reviewsOnly = false }) {
  const { user } = useAuth();
  const state = useData('/tutors/bookings');
  const [tab, setTab] = useState('upcoming');
  const teacher = user.role === 'teacher';
  const bookings = (state.data || []).filter((b) => {
    const confirmed = !b.status || b.status === 'confirmed';
    if (reviewsOnly) return confirmed && new Date(b.end) <= new Date();
    if (tab === 'requests') return !confirmed;
    return confirmed && (tab === 'past' ? new Date(b.end) <= new Date() : new Date(b.end) > new Date());
  });
  return <Shell><section className="tutor-panel"><h1>{reviewsOnly ? 'Rate Tutors' : 'Schedules'}</h1><p className="tutor-muted">{reviewsOnly ? 'Share feedback on your completed sessions.' : 'Your confirmed tutor bookings · Manila time (UTC+8)'}</p>
    {!reviewsOnly && <div className="tutor-tabs"><button className={tab === 'upcoming' ? 'selected' : ''} onClick={() => setTab('upcoming')}>Upcoming</button><button className={tab === 'requests' ? 'selected' : ''} onClick={() => setTab('requests')}>Requests</button><button className={tab === 'past' ? 'selected' : ''} onClick={() => setTab('past')}>Past sessions</button>{teacher && <Link to="/teacher/availability">Manage availability</Link>}</div>}
    <Status state={state} />{!state.loading && !state.error && !bookings.length && <div className="tutor-empty">{reviewsOnly ? 'No completed sessions yet.' : 'No sessions here yet.'} {!teacher && <Link to="/student/find-tutors">Find a tutor</Link>}</div>}
    <div className="tutor-schedule-list">{bookings.map((b) => <article className="tutor-panel" key={b._id}><div className="tutor-schedule-row"><div><h2>{b.subject}</h2><p>{teacher ? b.student?.name : b.teacher?.name}</p><p>{dateLabel(b.start)} · {time(b.start)}–{time(b.end)}</p></div><div><span className="tutor-badge">{b.status === 'pending' ? 'Pending approval' : b.status === 'declined' ? 'Declined' : new Date(b.end) <= new Date() ? 'Completed' : 'Confirmed'}</span><p>{money(b.price)}</p></div></div>
      {b.review?.rating ? <p className="tutor-review">★ {b.review.rating} — {b.review.text}</p> : !teacher && (!b.status || b.status === 'confirmed') && new Date(b.end) <= new Date() && <ReviewForm booking={b} onSaved={state.reload} />}
    </article>)}</div>
  </section></Shell>;
}
