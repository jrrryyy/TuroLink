import { ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, GraduationCap, MapPin, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/landing.css';

export default function Home() {
  return <div className="tl-home">
    <nav className="tl-nav" aria-label="Main navigation">
      <Link to="/" className="tl-brand" aria-label="TuroLink home"><span><BookOpen size={23} /></span>TuroLink<span className="tl-brand-dot">.</span></Link>
      <div className="tl-nav-links"><a href="#about">Why TuroLink</a><a href="#how-it-works">How it works</a><a href="#faq">FAQs</a></div>
      <div className="tl-nav-actions"><Link to="/login">Log in</Link><Link to="/register" className="tl-button">Get started <ArrowRight size={16} /></Link></div>
    </nav>
    <main>
      <section className="tl-hero" aria-labelledby="tl-hero-title">
        <div className="tl-hero-copy">
          <span className="tl-location"><span />LOCAL CONNECTIONS. BIG POSSIBILITIES.</span>
          <h1 id="tl-hero-title">A little guidance.<br />A world of <em>possibility.</em></h1>
          <p>Find your next “I get it” moment. Connect with tutors in Dagupan City and learn at a pace that works for you.</p>
          <div className="tl-hero-actions"><Link className="tl-button" to="/register">Find your tutor <ArrowRight size={18} /></Link><Link className="tl-teacher-link" to="/teacher/register">Become a tutor <ArrowRight size={17} /></Link></div>
          <div className="tl-hero-note"><MapPin size={16} /><span>Made for learners in Dagupan City</span></div>
        </div>
        <div className="tl-visual" aria-label="Illustration of connecting with a tutor and planning your learning">
          <div className="tl-orbit tl-orbit-one" /><div className="tl-orbit tl-orbit-two" />
          <div className="tl-spark"><Sparkles size={31} strokeWidth={1.5} /></div>
          <div className="tl-learning-card">
            <div className="tl-preview-label"><span className="tl-preview-icon"><BookOpen size={18} /></span>YOUR NEXT CHAPTER<span className="tl-live-dot" /></div>
            <h2>Small steps.<br /><em>Real understanding.</em></h2>
            <div className="tl-subject-chips"><span>Mathematics</span><span>Science</span><span>Programming</span></div>
            <div className="tl-study-scene" aria-hidden="true"><div className="tl-study-grid" /><div className="tl-book tl-book-back" /><div className="tl-book tl-book-front"><BookOpen size={52} strokeWidth={1.2} /><span>Room to grow.</span></div><span className="tl-study-sun" /><span className="tl-study-pencil" /></div>
            <div className="tl-card-bottom"><span className="tl-check"><Check size={17} /></span><div><strong>A plan that fits your life</strong><small>Your subject. Your schedule.</small></div><ArrowRight size={20} /></div>
          </div>
          <div className="tl-float tl-float-connect"><span><Users size={21} /></span><div><strong>Learn together</strong><small>One connection at a time</small></div></div>
          <div className="tl-float tl-float-schedule"><span><CalendarDays size={21} /></span><div><strong>Make time to grow</strong><small>Find a session that fits</small></div></div>
          <span className="tl-visual-caption">A fresh perspective starts here.</span>
        </div>
      </section>
      <div className="tl-benefit-strip"><span><Users size={20} />Connect with local tutors</span><span><CalendarDays size={20} />Choose an available time</span><span><BookOpen size={20} />Keep your learning in one place</span></div>
      <section className="tl-about tl-section" id="about"><div><span className="tl-eyebrow">A LITTLE CLOSER TO UNDERSTANDING</span><h2>Good learning starts<br />with a human connection.</h2></div><p>A tricky lesson feels different when someone helps you through it. TuroLink brings tutors, subjects, and session planning together, so you can spend less time organizing and more time learning.</p></section>
      <section className="tl-section tl-how" id="how-it-works"><div className="tl-section-heading"><div><span className="tl-eyebrow">YOUR PATH FORWARD</span><h2>From curious to confident.</h2></div><p>Getting help should feel simple.</p></div><div className="tl-steps">{[
        [Users, '01', 'Find your person', 'Explore tutor profiles, subjects, and reviews to find someone who fits your learning needs.'],
        [CalendarDays, '02', 'Make a little time', 'Choose a subject and available time, then send a session request for your teacher to accept.'],
        [GraduationCap, '03', 'Keep moving forward', 'Once accepted, find your subject, announcements, and materials together in your dashboard.'],
      ].map(([Icon, number, title, copy]) => <article key={number}><div><Icon size={25} /><span>{number}</span></div><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
      <section className="tl-section tl-faq" id="faq"><div><span className="tl-eyebrow">A FEW THINGS TO KNOW</span><h2>Curiosity is welcome here.</h2><p>Let’s clear up the little things.</p></div><div>{[
        ['How do I get started?', 'Create a student account, browse Find Tutor, and choose a subject and available session time. Your teacher will review your request before the session is confirmed.'],
        ['Can I join as a teacher?', 'Yes. Choose Become a tutor to register with your teaching information. You can then create subjects, set your hourly rate, and publish available times.'],
        ['Where can I find my learning materials?', 'After your teacher accepts a subject-specific request, open My Subjects to read announcements and access published materials.'],
        ['How much does a session cost?', 'Each teacher sets their hourly rate. You can review the rate and total before sending your request. TuroLink does not collect an online payment when you send a request.'],
      ].map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></section>
      <section className="tl-cta"><BookOpen size={36} strokeWidth={1.3} /><h2>Your next chapter<br />starts with a connection.</h2><Link to="/register" className="tl-button">Let’s get learning <ArrowRight size={18} /></Link><Link to="/teacher/register">Here to teach? Join as a tutor →</Link></section>
    </main>
    <footer className="tl-footer"><Link to="/" className="tl-brand">TuroLink.</Link><p>Local learning. Better connections.</p><span>Dagupan City, Philippines</span></footer>
  </div>;
}
