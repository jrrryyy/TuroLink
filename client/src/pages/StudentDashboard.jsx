import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, ArrowRight, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import "../styles/student-dashboard.css";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const detailsRef = useRef(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const today = new Date();
  const monthLabel = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const monthOffset = calendarMonth.getDay();
  const changeMonth = (offset) => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + offset, 1));

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      try {
        const [dashboard, courses] = await Promise.all([
          api.get("/student/dashboard-data"),
          api.get("/courses/my-courses"),
        ]);
        if (active) {
          setData(dashboard.data);
          setSubjects(courses.data);
        }
      } catch {
        if (active) setError("Unable to load your dashboard. Please refresh to try again.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadDashboard();
    return () => { active = false; };
  }, [revision]);

  const name = data?.student?.name || user?.name || "Student";
  const schedules = data?.upcomingClasses || [];
  const query = searchTerm.trim().toLowerCase();
  const filteredSubjects = subjects.filter((subject) =>
    [subject.title, subject.instructorName].some((value) => value?.toLowerCase().includes(query))
  );
  const sessionHours = data?.sessionHours || [];
  const maxHours = Math.max(1, ...sessionHours.map((session) => Number(session.hours) || 0));
  const nextClass = schedules[0];
  const firstName = name.trim().split(/\s+/)[0];

  return (
    <DashboardLayout role="student" userName={name}
      searchValue={searchTerm} onSearchChange={setSearchTerm}
      searchPlaceholder="Search your subjects...">
      <div className="student-dashboard-content">
        <header className="student-page-intro">
          <div>
            <span className="student-eyebrow">YOUR LEARNING SPACE</span>
            <h1>Dashboard</h1>
          </div>
          <span className="student-date">
            <CalendarDays size={16} />
            {new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" })}
          </span>
        </header>

        <section className="student-welcome">
          <div>
            <span className="student-eyebrow">A LITTLE PROGRESS TODAY...</span>
            <h1>Welcome back, {firstName}.</h1>
            <p>Make room for your next great lesson. Find tutors, review announcements, and prepare for upcoming sessions.</p>
            <Link className="student-hero-link" to="/student/find-tutors">
              <Search size={15} /> Find your next tutor <ArrowRight size={15} />
            </Link>
          </div>
          <div className="student-hero-aside">
            <CalendarDays size={26} />
            <span>YOUR NEXT SESSION</span>
            <strong>{nextClass?.subject || "Room for something new"}</strong>
            <p>{nextClass ? [nextClass.time, nextClass.tutor].filter(Boolean).join(" · ") : "Find a tutor and book a session that fits your schedule."}</p>
            {nextClass ? (
              <button
                type="button"
                onClick={() => detailsRef.current?.showModal()}
                aria-label="View session details"
              >
                Session details <ArrowRight size={15} />
              </button>
            ) : (
              <Link to="/student/find-tutors">
                Explore tutors <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </section>

        {loading ? (
          <div className="student-panel student-overview-loading" role="status">
            <p>Loading your dashboard…</p>
          </div>
        ) : error ? (
          <div className="student-ui-feedback" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => { setError(""); setLoading(true); setRevision((r) => r + 1); }}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <nav className="student-shortcuts" aria-label="Quick actions">
              <Link to="/student/find-tutors">
                <Search size={21} />
                <div>
                  <strong>Find a tutor</strong>
                  <span>Learn with someone who understands you</span>
                </div>
                <ArrowRight size={18} />
              </Link>
              <Link to="/student/schedules">
                <CalendarDays size={21} />
                <div>
                  <strong>Your schedules</strong>
                  <span>Manage sessions and track requests</span>
                </div>
                <ArrowRight size={18} />
              </Link>
              <Link to="/student/my-subjects">
                <BookOpen size={21} />
                <div>
                  <strong>My Subjects</strong>
                  <span>Course announcements and learning materials</span>
                </div>
                <ArrowRight size={18} />
              </Link>
            </nav>
            <div className="student-overview-grid">
              <section className="student-panel student-enrolled" aria-labelledby="student-subjects-heading">
                <div className="student-panel-heading">
                  <div><span className="student-eyebrow">YOUR LEARNING</span><h2 id="student-subjects-heading">Enrolled Subjects</h2></div>
                  <Link to="/student/my-subjects" aria-label="View all subjects" title="View all subjects"><BookOpen size={25} /></Link>
                </div>
                {filteredSubjects.length === 0 ? <div className="student-empty"><BookOpen size={32} /><h3>{query ? "No subjects found" : "No subjects yet"}</h3><p>{query ? "Try another subject or tutor name." : "Your enrolled subjects will appear here."}</p></div> :
                  <div className="student-course-list">{filteredSubjects.map((subject) => {
                    return <Link to={`/student/my-subjects/${subject._id}`} className="student-course-row" key={subject._id}>
                      <span className="student-course-initial">{subject.title?.charAt(0).toUpperCase()}</span>
                      <div className="student-course-info">
                        <div className="student-course-title"><h3>{subject.title}</h3></div>
                        <p>{subject.instructorName || "Tutor"}</p>
                      </div>
                    </Link>;
                  })}</div>}
                <Link className="student-all-subjects" to="/student/my-subjects">View all subjects <ArrowRight size={17} /></Link>
              </section>

              <div className="student-activity-column">
                <section className="student-panel student-history" aria-labelledby="student-history-heading">
                  <span className="student-eyebrow">ACTIVITY</span><h2 id="student-history-heading">Session History</h2>
                  {sessionHours.some(session => session.hours > 0) ? <div className="student-history-chart" role="img" aria-label={sessionHours.map((session) => session.month + ": " + session.hours + " hours").join(", ")}>
                    {sessionHours.map((session, index) => <div className="student-history-column" key={session.month + index} aria-hidden="true">
                      <div className="student-history-track"><div className="student-history-bar" style={{ height: Math.max(0, Number(session.hours) || 0) / maxHours * 100 + "%" }}><span>{session.hours}h</span></div></div>
                      <span className="student-history-month">{session.month}</span>
                    </div>)}
                  </div> : <div className="student-empty"><Clock3 size={28} /><p>Your session hours will appear here.</p></div>}
                </section>

                <section className="student-panel student-calendar" aria-label="Calendar">
                  <div className="student-calendar-heading">
                    <h2 aria-live="polite">{monthLabel}</h2>
                    <div><button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button><button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button></div>
                  </div>
                  <div className="student-calendar-grid">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span className="student-calendar-weekday" key={day}>{day}</span>)}
                    {Array.from({ length: monthOffset }, (_, index) => <span key={"blank-" + index} />)}
                    {Array.from({ length: monthDays }, (_, index) => {
                      const day = index + 1;
                      const isToday = day === today.getDate() && calendarMonth.getMonth() === today.getMonth() && calendarMonth.getFullYear() === today.getFullYear();
                      return <span key={day} className={isToday ? "student-calendar-today" : ""} aria-current={isToday ? "date" : undefined}>{day}</span>;
                    })}
                  </div>
                  <div className="student-calendar-footer"><CalendarDays size={16} /><span>Today / {today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span><button type="button" onClick={() => setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button></div>
                </section>
              </div>
            </div>
          </>
        )}
        <dialog ref={detailsRef} className="student-session-dialog" aria-labelledby="student-session-title">
          <div className="student-panel-heading"><h2 id="student-session-title">Session Details</h2><button type="button" aria-label="Close session details" onClick={() => detailsRef.current.close()}><X size={22} /></button></div>
          {schedules.map((schedule, index) => <article className="student-session-item" key={schedule._id || index}><h3>{schedule.subject}</h3><p>{schedule.time}</p><p>{schedule.tutor}</p></article>)}
        </dialog>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
