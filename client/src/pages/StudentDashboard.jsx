import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ArrowRight,
  Search,
  X,
  TrendingUp,
  Award,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  GraduationCap
} from "lucide-react";
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
  const [graphTab, setGraphTab] = useState("trend"); // 'trend' | 'subjects' | 'recent'
  const [hoveredPoint, setHoveredPoint] = useState(null);

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
  const totalSessionHours = sessionHours.reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
  const nextClass = schedules[0];
  const firstName = name.trim().split(/\s+/)[0];

  // Assessment statistics and history from API
  const assessments = data?.assessments || {};
  const overallAverage = assessments.overallAverage;
  const assessmentStats = assessments.stats || {};
  const assessmentHistory = assessments.history || [];
  const assessmentBySubject = assessments.bySubject || [];
  const recentAssessments = assessments.recent || [];

  // Performance tier label and color helper
  const getTierInfo = (score) => {
    if (score === null || score === undefined) return { label: "No Grades Yet", tierClass: "tier-none", color: "#67766b" };
    if (score >= 90) return { label: "Honors · Excellent", tierClass: "tier-honors", color: "#22c55e" };
    if (score >= 80) return { label: "Strong Performance", tierClass: "tier-good", color: "#10b981" };
    if (score >= 75) return { label: "Passing Standard", tierClass: "tier-passing", color: "#3b82f6" };
    return { label: "Needs Practice", tierClass: "tier-warning", color: "#f59e0b" };
  };

  const overallTier = getTierInfo(overallAverage);

  // SVG Chart Geometry Calculations
  const chartWidth = 660;
  const chartHeight = 210;
  const paddingX = 48;
  const paddingTop = 24;
  const paddingBottom = 38;
  const graphInnerHeight = chartHeight - paddingTop - paddingBottom;
  const graphInnerWidth = chartWidth - paddingX * 2;

  // Map percentage (0-100) to SVG y coordinate
  const getY = (percentage) => {
    const clamped = Math.max(0, Math.min(100, percentage));
    return paddingTop + graphInnerHeight * (1 - clamped / 100);
  };

  // Map history index to SVG x coordinate
  const getX = (index, total) => {
    if (total <= 1) return chartWidth / 2;
    return paddingX + (index / (total - 1)) * graphInnerWidth;
  };

  // Generate SVG path for line and area
  let linePath = "";
  let areaPath = "";
  const points = assessmentHistory.map((item, index) => {
    const x = getX(index, assessmentHistory.length);
    const y = getY(item.percentage);
    return { ...item, x, y };
  });

  if (points.length === 1) {
    linePath = `M ${points[0].x - 40} ${points[0].y} L ${points[0].x + 40} ${points[0].y}`;
    areaPath = `M ${points[0].x - 40} ${points[0].y} L ${points[0].x + 40} ${points[0].y} L ${points[0].x + 40} ${chartHeight - paddingBottom} L ${points[0].x - 40} ${chartHeight - paddingBottom} Z`;
  } else if (points.length > 1) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      // Smooth cubic curve control points
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      const cpY2 = curr.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    areaPath = `${linePath} L ${lastPoint.x} ${chartHeight - paddingBottom} L ${firstPoint.x} ${chartHeight - paddingBottom} Z`;
  }

  // Passing threshold baseline (75%)
  const passingY = getY(75);

  return (
    <DashboardLayout
      role="student"
      userName={name}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search your subjects..."
    >
      <div className="student-dashboard-content">
        {/* ── Page Header ── */}
        <header className="student-page-intro">
          <div>
            <span className="student-eyebrow">YOUR LEARNING SPACE</span>
            <h1>Dashboard</h1>
          </div>
          <span className="student-date">
            <CalendarDays size={16} />
            {new Date().toLocaleDateString("en-PH", {
              timeZone: "Asia/Manila",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </header>

        {/* ── Modern Welcome Hero ── */}
        <section className="student-welcome">
          <div className="student-hero-main">
            <span className="student-eyebrow">ACADEMIC JOURNEY</span>
            <h1>Welcome back, {firstName}.</h1>
            <p>
              Stay ahead with real-time feedback, track your assessment progress across all
              subjects, and connect with your tutors anytime.
            </p>

            <div className="student-hero-stats-row">
              <div className="student-hero-stat-pill">
                <GraduationCap size={15} />
                <span><strong>{subjects.length}</strong> Enrolled Subjects</span>
              </div>
              <div className="student-hero-stat-pill">
                <Clock3 size={15} />
                <span><strong>{Math.round(totalSessionHours * 10) / 10}h</strong> Tutoring Hours</span>
              </div>
              <div className="student-hero-stat-pill highlight">
                <Award size={15} />
                <span>
                  <strong>{overallAverage !== null ? `${overallAverage}%` : "No grades yet"}</strong> Avg Score
                </span>
              </div>
            </div>

            <Link className="student-hero-link" to="/student/find-tutors">
              <Search size={15} /> Find your next tutor <ArrowRight size={15} />
            </Link>
          </div>

          <div className="student-hero-aside">
            <CalendarDays size={26} />
            <span>YOUR NEXT SESSION</span>
            <strong>{nextClass?.subject || "Room for something new"}</strong>
            <p>
              {nextClass
                ? [nextClass.time, nextClass.tutor].filter(Boolean).join(" · ")
                : "Book a tutoring session with an instructor that fits your schedule."}
            </p>
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

        {/* ── Loading / Error states ── */}
        {loading ? (
          <div className="student-panel student-overview-loading" role="status">
            <div className="student-loading-spinner" />
            <p>Loading your dashboard…</p>
          </div>
        ) : error ? (
          <div className="student-ui-feedback" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setError("");
                setLoading(true);
                setRevision((r) => r + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* ── Metric Snapshot Cards ── */}
            <div className="student-metric-strip">
              <article className="student-metric-card primary-accent">
                <div className="student-metric-top">
                  <span className="student-metric-label">Average Assessment Score</span>
                  <Award className="student-metric-icon" size={20} />
                </div>
                <div className="student-metric-value-row">
                  <strong className="student-metric-big">
                    {overallAverage !== null ? `${overallAverage}%` : "—"}
                  </strong>
                  <span className={`student-tier-badge ${overallTier.tierClass}`}>
                    {overallTier.label}
                  </span>
                </div>
                <p className="student-metric-subtext">
                  {assessmentStats.totalGraded
                    ? `Based on ${assessmentStats.totalGraded} graded ${assessmentStats.totalGraded === 1 ? "task" : "tasks"}`
                    : "No graded tasks yet"}
                </p>
              </article>

              <article className="student-metric-card">
                <div className="student-metric-top">
                  <span className="student-metric-label">Enrolled Subjects</span>
                  <BookOpen className="student-metric-icon" size={20} />
                </div>
                <div className="student-metric-value-row">
                  <strong className="student-metric-big">{subjects.length}</strong>
                  <span className="student-badge-muted">Active classes</span>
                </div>
                <p className="student-metric-subtext">Course materials & discussions</p>
              </article>

              <article className="student-metric-card">
                <div className="student-metric-top">
                  <span className="student-metric-label">Study Time</span>
                  <Clock3 className="student-metric-icon" size={20} />
                </div>
                <div className="student-metric-value-row">
                  <strong className="student-metric-big">{Math.round(totalSessionHours * 10) / 10}h</strong>
                  <span className="student-badge-muted">Completed</span>
                </div>
                <p className="student-metric-subtext">Tutoring & scheduled hours</p>
              </article>

              <article className="student-metric-card">
                <div className="student-metric-top">
                  <span className="student-metric-label">Next Scheduled</span>
                  <CalendarDays className="student-metric-icon" size={20} />
                </div>
                <div className="student-metric-value-row">
                  <strong className="student-metric-subject-title">
                    {nextClass?.subject || "No class"}
                  </strong>
                </div>
                <p className="student-metric-subtext">
                  {nextClass?.time ? nextClass.time : "Schedule open with tutors"}
                </p>
              </article>
            </div>

            {/* ── Quick Shortcut Navigation ── */}
            <nav className="student-shortcuts" aria-label="Quick actions">
              <Link to="/student/find-tutors">
                <div className="student-shortcut-icon-wrap">
                  <Search size={20} />
                </div>
                <div>
                  <strong>Find a tutor</strong>
                  <span>Learn 1-on-1 with accredited tutors</span>
                </div>
                <ArrowRight size={18} />
              </Link>

              <Link to="/student/schedules">
                <div className="student-shortcut-icon-wrap">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <strong>Your schedules</strong>
                  <span>Manage sessions & booking requests</span>
                </div>
                <ArrowRight size={18} />
              </Link>

              <Link to="/student/my-subjects">
                <div className="student-shortcut-icon-wrap">
                  <BookOpen size={20} />
                </div>
                <div>
                  <strong>My Subjects</strong>
                  <span>Class materials, assignments & quizzes</span>
                </div>
                <ArrowRight size={18} />
              </Link>
            </nav>

            {/* ── Core Assessment Performance Graph Panel ── */}
            <section className="student-panel student-assessment-graph-card" aria-labelledby="assessment-heading">
              <div className="student-assessment-header">
                <div>
                  <div className="student-assessment-title-wrap">
                    <span className="student-eyebrow">PERFORMANCE ANALYTICS</span>
                    <h2 id="assessment-heading">Assessment Score Analytics</h2>
                  </div>
                  <p className="student-assessment-desc">
                    Monitor your quiz and assignment grades, subject benchmarks, and overall academic trajectory.
                  </p>
                </div>

                {/* Graph Tab Switcher */}
                <div className="student-graph-tabs" role="tablist" aria-label="Assessment views">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={graphTab === "trend"}
                    className={`student-graph-tab ${graphTab === "trend" ? "active" : ""}`}
                    onClick={() => setGraphTab("trend")}
                  >
                    <TrendingUp size={15} />
                    <span>Score Progression</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={graphTab === "subjects"}
                    className={`student-graph-tab ${graphTab === "subjects" ? "active" : ""}`}
                    onClick={() => setGraphTab("subjects")}
                  >
                    <BarChart3 size={15} />
                    <span>By Subject</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={graphTab === "recent"}
                    className={`student-graph-tab ${graphTab === "recent" ? "active" : ""}`}
                    onClick={() => setGraphTab("recent")}
                  >
                    <CheckCircle2 size={15} />
                    <span>Recent Tasks ({recentAssessments.length})</span>
                  </button>
                </div>
              </div>

              {/* View 1: Score Progression Curve Graph */}
              {graphTab === "trend" && (
                <div className="student-graph-container">
                  {points.length > 0 ? (
                    <>
                      <div className="student-svg-chart-wrap">
                        <svg
                          className="student-assessment-svg"
                          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <defs>
                            <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#355c42" stopOpacity="0.32" />
                              <stop offset="85%" stopColor="#355c42" stopOpacity="0.03" />
                              <stop offset="100%" stopColor="#355c42" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="scoreLineGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#294d38" />
                              <stop offset="50%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                          </defs>

                          {/* Horizontal Grid lines */}
                          {[100, 75, 50, 25, 0].map((pct) => {
                            const y = getY(pct);
                            const isPassing = pct === 75;
                            return (
                              <g key={pct} className="student-chart-gridline">
                                <line
                                  x1={paddingX}
                                  y1={y}
                                  x2={chartWidth - paddingX}
                                  y2={y}
                                  stroke={isPassing ? "#10b98166" : "var(--layout-border)"}
                                  strokeDasharray={isPassing ? "4 4" : "2 3"}
                                  strokeWidth={isPassing ? 1.5 : 1}
                                />
                                <text
                                  x={paddingX - 10}
                                  y={y + 4}
                                  textAnchor="end"
                                  className="student-chart-axis-label"
                                >
                                  {pct}%
                                </text>
                              </g>
                            );
                          })}

                          {/* Benchmark label for passing */}
                          <text
                            x={chartWidth - paddingX}
                            y={passingY - 6}
                            textAnchor="end"
                            className="student-passing-benchmark-text"
                          >
                            Passing Benchmark (75%)
                          </text>

                          {/* Gradient Fill under Curve */}
                          {areaPath && (
                            <path d={areaPath} fill="url(#scoreAreaGradient)" />
                          )}

                          {/* Line / Curve */}
                          {linePath && (
                            <path
                              d={linePath}
                              fill="none"
                              stroke="url(#scoreLineGradient)"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}

                          {/* Data points */}
                          {points.map((pt, idx) => {
                            const isHovered = hoveredPoint?.id === pt.id;
                            return (
                              <g
                                key={pt.id || idx}
                                className="student-chart-point-group"
                                onMouseEnter={() => setHoveredPoint(pt)}
                                onMouseLeave={() => setHoveredPoint(null)}
                              >
                                {/* Transparent target for easier hover */}
                                <circle cx={pt.x} cy={pt.y} r={16} fill="transparent" cursor="pointer" />

                                {/* Outer ring on hover */}
                                {isHovered && (
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={10}
                                    fill="#10b98126"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                  />
                                )}

                                {/* Inner point */}
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isHovered ? 6 : 4.5}
                                  fill={pt.percentage >= 75 ? "#10b981" : "#f59e0b"}
                                  stroke="#fff"
                                  strokeWidth={2.5}
                                  cursor="pointer"
                                />

                                {/* X-axis Date label */}
                                <text
                                  x={pt.x}
                                  y={chartHeight - 12}
                                  textAnchor="middle"
                                  className="student-chart-date-label"
                                >
                                  {pt.formattedDate || pt.date}
                                </text>
                              </g>
                            );
                          })}
                        </svg>

                        {/* Interactive floating tooltip */}
                        {hoveredPoint && (
                          <div
                            className="student-chart-tooltip"
                            style={{
                              left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                              top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                            }}
                          >
                            <div className="student-tooltip-header">
                              <span className="student-tooltip-subject">{hoveredPoint.subject}</span>
                              <span className="student-tooltip-date">{hoveredPoint.formattedDate}</span>
                            </div>
                            <strong className="student-tooltip-title">{hoveredPoint.title}</strong>
                            <div className="student-tooltip-score-row">
                              <span className="student-tooltip-score">
                                {hoveredPoint.score} / {hoveredPoint.maxPoints} pts
                              </span>
                              <span
                                className={`student-tooltip-pct ${
                                  hoveredPoint.percentage >= 75 ? "pass" : "warn"
                                }`}
                              >
                                {hoveredPoint.percentage}%
                              </span>
                            </div>
                            {hoveredPoint.feedback && (
                              <p className="student-tooltip-feedback">
                                &ldquo;{hoveredPoint.feedback}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Score metrics footer */}
                      <div className="student-graph-footer-stats">
                        <div className="student-graph-stat-item">
                          <span>Overall Average</span>
                          <strong>{overallAverage}%</strong>
                        </div>
                        <div className="student-graph-stat-item">
                          <span>Highest Score</span>
                          <strong className="score-high">{assessmentStats.highestScore ?? "—"}%</strong>
                        </div>
                        <div className="student-graph-stat-item">
                          <span>Lowest Score</span>
                          <strong className="score-low">{assessmentStats.lowestScore ?? "—"}%</strong>
                        </div>
                        <div className="student-graph-stat-item">
                          <span>Tasks Graded</span>
                          <strong>{assessmentStats.totalGraded || 0}</strong>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="student-graph-empty">
                      <GraduationCap size={40} className="student-empty-icon" />
                      <h3>No graded assessments yet</h3>
                      <p>
                        Once your teachers grade your submitted assignments and quizzes, your score
                        progression curve and performance trends will appear here automatically.
                      </p>
                      <Link to="/student/my-subjects" className="student-primary-button">
                        <BookOpen size={16} /> View your enrolled subjects
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Subject-by-Subject Score Breakdown */}
              {graphTab === "subjects" && (
                <div className="student-subjects-breakdown-view">
                  {assessmentBySubject.length > 0 ? (
                    <div className="student-subject-bars-list">
                      {assessmentBySubject.map((subj) => {
                        const score = subj.averageScore;
                        const barWidth = score !== null ? `${Math.max(5, Math.min(100, score))}%` : "0%";
                        const colorClass =
                          score === null
                            ? "bar-none"
                            : score >= 90
                            ? "bar-honors"
                            : score >= 80
                            ? "bar-good"
                            : score >= 75
                            ? "bar-passing"
                            : "bar-warning";

                        return (
                          <div key={subj.subjectId} className="student-subject-bar-row">
                            <div className="student-subject-bar-header">
                              <div>
                                <span className="student-subject-bar-code">{subj.code}</span>
                                <strong className="student-subject-bar-title">{subj.title}</strong>
                              </div>
                              <div className="student-subject-bar-score-wrap">
                                {score !== null ? (
                                  <span className={`student-subject-score-pill ${colorClass}`}>
                                    {score}% Average
                                  </span>
                                ) : (
                                  <span className="student-subject-score-pill bar-none">
                                    No grades yet
                                  </span>
                                )}
                                <span className="student-subject-graded-count">
                                  {subj.gradedCount} graded of {subj.totalMaterials} materials
                                </span>
                              </div>
                            </div>
                            <div className="student-subject-track">
                              <div
                                className={`student-subject-fill ${colorClass}`}
                                style={{ width: barWidth }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="student-graph-empty">
                      <BookOpen size={36} />
                      <h3>No subjects found</h3>
                      <p>Enroll in subjects to start taking assessments and tracking your grades.</p>
                      <Link to="/student/find-tutors" className="student-primary-button">
                        Explore tutors & courses
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* View 3: Recent Tasks Feed */}
              {graphTab === "recent" && (
                <div className="student-recent-tasks-view">
                  {recentAssessments.length > 0 ? (
                    <div className="student-recent-tasks-list">
                      {recentAssessments.map((task) => (
                        <div key={task.id} className="student-recent-task-row">
                          <div className="student-task-icon-col">
                            {task.type === "quiz" ? (
                              <Award size={20} className="student-task-icon quiz" />
                            ) : (
                              <FileText size={20} className="student-task-icon assignment" />
                            )}
                          </div>
                          <div className="student-task-main">
                            <div className="student-task-header">
                              <strong className="student-task-title">{task.title}</strong>
                              <span className="student-task-type-badge">{task.type}</span>
                            </div>
                            <div className="student-task-meta">
                              <span>{task.subject}</span>
                              <span>·</span>
                              <span>{task.formattedDate || task.date}</span>
                              {task.feedback && (
                                <>
                                  <span>·</span>
                                  <span className="student-task-feedback-quote">
                                    &ldquo;{task.feedback}&rdquo;
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="student-task-score-col">
                            <div className="student-task-score-bubble">
                              <strong>{task.percentage}%</strong>
                              <small>{task.score} / {task.maxPoints} pts</small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="student-graph-empty">
                      <CheckCircle2 size={36} />
                      <h3>No graded tasks yet</h3>
                      <p>Completed and graded tasks will appear here in chronological order.</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── Main Two-Column Content Grid ── */}
            <div className="student-overview-grid">
              {/* Left Column: Enrolled Subjects */}
              <section className="student-panel student-enrolled" aria-labelledby="student-subjects-heading">
                <div className="student-panel-heading">
                  <div>
                    <span className="student-eyebrow">YOUR LEARNING</span>
                    <h2 id="student-subjects-heading">Enrolled Subjects</h2>
                  </div>
                  <Link
                    to="/student/my-subjects"
                    aria-label="View all subjects"
                    title="View all subjects"
                    className="student-panel-header-action"
                  >
                    <BookOpen size={20} />
                  </Link>
                </div>

                {filteredSubjects.length === 0 ? (
                  <div className="student-empty">
                    <BookOpen size={32} />
                    <h3>{query ? "No subjects found" : "No subjects yet"}</h3>
                    <p>{query ? "Try another subject or tutor name." : "Your enrolled subjects will appear here."}</p>
                  </div>
                ) : (
                  <div className="student-course-list">
                    {filteredSubjects.map((subject) => {
                      // Find average score for this subject from assessments.bySubject
                      const subjectScoreData = assessmentBySubject.find(
                        (b) => String(b.subjectId) === String(subject._id)
                      );
                      const subjScore = subjectScoreData?.averageScore;

                      return (
                        <Link
                          to={`/student/my-subjects/${subject._id}`}
                          className="student-course-row"
                          key={subject._id}
                        >
                          <span className="student-course-initial">
                            {subject.title?.charAt(0).toUpperCase()}
                          </span>
                          <div className="student-course-info">
                            <div className="student-course-title">
                              <h3>{subject.title}</h3>
                              {subjScore !== null && subjScore !== undefined ? (
                                <span className="student-course-score-badge">
                                  {subjScore}% Avg
                                </span>
                              ) : (
                                <span className="student-course-score-badge empty">
                                  Enrolled
                                </span>
                              )}
                            </div>
                            <p>{subject.instructorName || "Tutor"}</p>
                          </div>
                          <ArrowRight size={16} className="student-course-arrow" />
                        </Link>
                      );
                    })}
                  </div>
                )}
                <Link className="student-all-subjects" to="/student/my-subjects">
                  <span>View all subjects & classwork</span>
                  <ArrowRight size={17} />
                </Link>
              </section>

              {/* Right Column: Activity & Calendar */}
              <div className="student-activity-column">
                <section className="student-panel student-history" aria-labelledby="student-history-heading">
                  <div className="student-panel-heading">
                    <div>
                      <span className="student-eyebrow">ACTIVITY</span>
                      <h2 id="student-history-heading">Session History</h2>
                    </div>
                    <Clock3 size={18} className="student-panel-header-icon" />
                  </div>
                  {sessionHours.some((session) => session.hours > 0) ? (
                    <div
                      className="student-history-chart"
                      role="img"
                      aria-label={sessionHours.map((session) => session.month + ": " + session.hours + " hours").join(", ")}
                    >
                      {sessionHours.map((session, index) => (
                        <div className="student-history-column" key={session.month + index} aria-hidden="true">
                          <div className="student-history-track">
                            <div
                              className="student-history-bar"
                              style={{
                                height: `${(Math.max(0, Number(session.hours) || 0) / maxHours) * 100}%`,
                              }}
                            >
                              <span>{session.hours}h</span>
                            </div>
                          </div>
                          <span className="student-history-month">{session.month}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="student-empty">
                      <Clock3 size={28} />
                      <p>Your session hours will appear here as you complete tutoring sessions.</p>
                    </div>
                  )}
                </section>

                <section className="student-panel student-calendar" aria-label="Calendar">
                  <div className="student-calendar-heading">
                    <h2 aria-live="polite">{monthLabel}</h2>
                    <div>
                      <button
                        type="button"
                        aria-label="Previous month"
                        onClick={() => changeMonth(-1)}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        aria-label="Next month"
                        onClick={() => changeMonth(1)}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="student-calendar-grid">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <span className="student-calendar-weekday" key={day}>
                        {day}
                      </span>
                    ))}
                    {Array.from({ length: monthOffset }, (_, index) => (
                      <span key={"blank-" + index} />
                    ))}
                    {Array.from({ length: monthDays }, (_, index) => {
                      const day = index + 1;
                      const isToday =
                        day === today.getDate() &&
                        calendarMonth.getMonth() === today.getMonth() &&
                        calendarMonth.getFullYear() === today.getFullYear();
                      return (
                        <span
                          key={day}
                          className={isToday ? "student-calendar-today" : ""}
                          aria-current={isToday ? "date" : undefined}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                  <div className="student-calendar-footer">
                    <CalendarDays size={16} />
                    <span>
                      Today / {today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                      }
                    >
                      Today
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}

        {/* ── Next Session Dialog ── */}
        <dialog
          ref={detailsRef}
          className="student-session-dialog"
          aria-labelledby="student-session-title"
        >
          <div className="student-panel-heading">
            <h2 id="student-session-title">Session Details</h2>
            <button
              type="button"
              aria-label="Close session details"
              onClick={() => detailsRef.current?.close()}
            >
              <X size={22} />
            </button>
          </div>
          {schedules.map((schedule, index) => (
            <article className="student-session-item" key={schedule._id || index}>
              <h3>{schedule.subject}</h3>
              <p>{schedule.time}</p>
              <p>{schedule.tutor}</p>
            </article>
          ))}
        </dialog>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
