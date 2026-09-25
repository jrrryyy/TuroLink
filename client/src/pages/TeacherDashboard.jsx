import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, Plus, Star, Users } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    api.get('/teacher/dashboard-data').then(({ data }) => { if (active) { setData(data); setError(''); } }).catch(() => { if (active) setError('Your overview could not be loaded. Please try again.'); });
    return () => { active = false; };
  }, [revision]);
  const stats = data?.statistics || {};
  const schedules = data?.schedules || [];
  const requests = data?.requests || [];
  const name = (data?.teacher?.name || user?.name || 'Teacher').trim().split(' ')[0];
  const cards = [
    { label: 'Active students', value: stats.activeStudents ?? 0, note: 'Across your subjects', icon: Users },
    { label: 'Teaching this week', value: `${stats.weeklyHours ?? 0}h`, note: 'Completed session hours', icon: Clock3 },
    { label: 'Your subjects', value: stats.activeSubjects ?? 0, note: 'Spaces for learning', icon: BookOpen },
    { label: 'Student rating', value: stats.totalRatings ? `${Number(stats.averageRating).toFixed(1)}/5` : 'No ratings', note: stats.totalRatings ? `${stats.totalRatings} student reviews` : 'After your first reviewed session', icon: Star },
  ];
  return <DashboardLayout role="teacher" requestCount={requests.length} searchPlaceholder="Search your subjects...">
    <div className="teacher-overview">
      <header className="teacher-page-intro"><div><span className="teacher-eyebrow">YOUR TEACHING SPACE</span><h1>Dashboard</h1></div><span className="teacher-date"><CalendarDays size={16} />{new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' })}</span></header>
      <section className="teacher-hero"><div><span className="teacher-eyebrow">A LITTLE GUIDANCE. A LASTING DIFFERENCE.</span><h2>Welcome back, {name}.</h2><p>Make room for your next great lesson. Your students, subjects, and upcoming sessions are right here.</p><Link className="teacher-ui-button light" to="/teacher/my-subjects"><BookOpen size={17} />Manage subjects<ArrowRight size={17} /></Link></div><div className="teacher-hero-aside"><CalendarDays size={26} /><span>YOUR NEXT SESSION</span><strong>{schedules[0]?.subject || 'Room for something new'}</strong><p>{schedules[0]?.time || 'Publish your availability so students can find a time with you.'}</p><Link to={schedules.length ? '/teacher/schedules' : '/teacher/availability'}>{schedules.length ? 'View schedule' : 'Set availability'}<ArrowRight size={16} /></Link></div></section>
      {error && <div role="alert" className="teacher-ui-feedback">{error}<button type="button" onClick={() => { setError(''); setRevision(v => v + 1); }}>Try again</button></div>}
      {!data && !error ? <div className="teacher-overview-loading" role="status">Loading your teaching overview...</div> : data && <>
        <section className="teacher-metrics" aria-label="Teaching overview">{cards.map(({ label, value, note, icon: Icon }) => <article key={label}><div><span>{label}</span><Icon size={19} /></div><strong>{value}</strong><p>{note}</p></article>)}</section>
        <div className="teacher-overview-grid"><section className="teacher-ui-card"><header><div><span className="teacher-eyebrow">PLAN YOUR DAY</span><h2>Upcoming sessions</h2></div><Link to="/teacher/schedules">View calendar<ArrowRight size={16} /></Link></header>
          {schedules.length ? <div className="teacher-agenda">{schedules.slice(0, 5).map((session, i) => <article key={session._id || i}><span className="teacher-agenda-icon"><BookOpen size={20} /></span><div><h3>{session.subject}</h3><p>{session.time}</p>{session.students?.length > 0 && <small>{session.students.map(s => s.name || 'Student').join(', ')}</small>}</div><Link to="/teacher/schedules" aria-label={`View ${session.subject} session`}><ArrowRight size={18} /></Link></article>)}</div> : <div className="teacher-ui-empty"><CalendarDays size={30} /><h3>Your next lesson starts here</h3><p>Add available times. Confirmed student requests will appear in your schedule.</p><Link className="teacher-ui-button" to="/teacher/availability"><Plus size={16} />Add availability</Link></div>}
        </section><section className="teacher-ui-card"><header><div><span className="teacher-eyebrow">CONNECT WITH LEARNERS</span><h2>Tutoring requests <span className="teacher-count">{requests.length}</span></h2></div></header>
          {requests.length ? <><div className="teacher-request-preview">{requests.slice(0, 3).map((request, i) => <article key={request._id || i}><span className="teacher-person-avatar">{request.studentName?.charAt(0) || 'S'}</span><div><h3>{request.studentName}</h3><p>{request.subject}</p><small>{request.time}</small></div></article>)}</div><Link className="teacher-ui-button full" to="/teacher/requests">Review requests<ArrowRight size={17} /></Link></> : <div className="teacher-ui-empty"><CheckCircle2 size={30} /><h3>All caught up</h3><p>New tutoring requests will appear here when students book your available times.</p><Link to="/teacher/requests">View requests<ArrowRight size={15} /></Link></div>}
        </section></div>
      </>}
      <section className="teacher-quick-actions" aria-label="Quick actions"><Link to="/teacher/my-subjects"><BookOpen size={21} /><div><strong>Prepare your next lesson</strong><span>Share announcements and classwork</span></div><ArrowRight size={18} /></Link><Link to="/teacher/availability"><Clock3 size={21} /><div><strong>Make time to teach</strong><span>Manage your rate and available slots</span></div><ArrowRight size={18} /></Link><Link to="/teacher/settings"><Users size={21} /><div><strong>Make your profile yours</strong><span>Update your bio and profile picture</span></div><ArrowRight size={18} /></Link></section>
    </div>
  </DashboardLayout>;
}
