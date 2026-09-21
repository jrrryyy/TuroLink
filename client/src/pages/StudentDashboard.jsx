import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, X } from "lucide-react";
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
  }, []);

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
        <section className="student-welcome">
          <div>
            <span className="student-eyebrow">STUDENT DASHBOARD</span>
            <h1>Welcome Back, {firstName}!</h1>
            <p>Keep building your knowledge one session at a time.</p>
          </div>
          <div className="student-welcome-symbol" aria-hidden="true"><BookOpen size={46} strokeWidth={1.7} /></div>
        </section>

        {loading ? <div className="student-panel student-empty" role="status">Loading dashboard...</div>
          : error ? <div className="student-panel student-empty" role="alert">{error}</div>
          : <>
            <section className="student-panel student-next-class" aria-labelledby="student-next-heading">
              <div>
                <span className="student-eyebrow">YOUR NEXT CLASS</span>
                <h2 id="student-next-heading">{nextClass?.subject || "No upcoming classes"}</h2>
                <p>{nextClass ? [nextClass.time, nextClass.tutor].filter(Boolean).join(" ? ") : "Your next tutoring session will appear here."}</p>
              </div>
              {nextClass && <button type="button" className="student-primary-button" onClick={() => detailsRef.current.showModal()}>Session Details</button>}
            </section>

            <div className="student-overview-grid">
              <section className="student-panel student-enrolled" aria-labelledby="student-subjects-heading">
                <div className="student-panel-heading">
                  <div><span className="student-eyebrow">YOUR LEARNING</span><h2 id="student-subjects-heading">Enrolled Subjects</h2></div>
                  <Link to="/student/my-subjects" aria-label="View all subjects" title="View all subjects"><BookOpen size={25} /></Link>
                </div>
                {filteredSubjects.length === 0 ? <div className="student-empty"><BookOpen size={32} /><h3>{query ? "No subjects found" : "No subjects yet"}</h3><p>{query ? "Try another subject or tutor name." : "Your enrolled subjects will appear here."}</p></div> :
                  <div className="student-course-list">{filteredSubjects.map((subject) => {
                    const record = data?.enrolledCourses?.find((course) => course.name?.toLowerCase() === subject.title?.toLowerCase());
                    const progress = typeof record?.progress === "number" ? Math.min(100, Math.max(0, record.progress)) : null;
                    return <Link to="/student/my-subjects" className="student-course-row" key={subject._id}>
                      <span className="student-course-initial">{subject.title?.charAt(0).toUpperCase()}</span>
                      <div className="student-course-info">
                        <div className="student-course-title"><h3>{subject.title}</h3>{progress !== null && <span>{progress}%</span>}</div>
                        {progress !== null ? <progress value={progress} max="100" aria-label={subject.title + " progress"} /> : <p>{subject.instructorName || "Tutor"}</p>}
                      </div>
                    </Link>;
                  })}</div>}
                <Link className="student-all-subjects" to="/student/my-subjects">View all subjects <span aria-hidden="true">?</span></Link>
              </section>

              <div className="student-activity-column">
                <section className="student-panel student-history" aria-labelledby="student-history-heading">
                  <span className="student-eyebrow">ACTIVITY</span><h2 id="student-history-heading">Session History</h2>
                  {sessionHours.length ? <div className="student-history-chart" role="img" aria-label={sessionHours.map((session) => session.month + ": " + session.hours + " hours").join(", ")}>
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
                  <div className="student-calendar-footer"><CalendarDays size={16} /><span>Today ? {today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span><button type="button" onClick={() => setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button></div>
                </section>
              </div>
            </div>
          </>}
        <dialog ref={detailsRef} className="student-session-dialog" aria-labelledby="student-session-title">
          <div className="student-panel-heading"><h2 id="student-session-title">Session Details</h2><button type="button" aria-label="Close session details" onClick={() => detailsRef.current.close()}><X size={22} /></button></div>
          {schedules.map((schedule, index) => <article className="student-session-item" key={schedule._id || index}><h3>{schedule.subject}</h3><p>{schedule.time}</p><p>{schedule.tutor}</p></article>)}
        </dialog>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
