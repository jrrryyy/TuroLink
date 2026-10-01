import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  BarChart3,
  History,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Star,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import '../styles/teacher-graph.css';

export default function TeacherCompletedSessionsGraph({ analytics }) {
  const [activeTab, setActiveTab] = useState('trend'); // 'trend' | 'subjects' | 'recent'
  const [timeRange, setTimeRange] = useState('7days'); // '7days' | 'monthly'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const data = analytics || {
    totalCompleted: 0,
    totalHours: 0,
    thisWeekCount: 0,
    thisWeekHours: 0,
    dailyTrend: [],
    monthlyTrend: [],
    bySubject: [],
    recentCompleted: [],
  };

  const series = timeRange === '7days'
    ? (data.dailyTrend || [])
    : (data.monthlyTrend || []);

  // SVG Geometry
  const chartWidth = 660;
  const chartHeight = 220;
  const paddingX = 44;
  const paddingTop = 30;
  const paddingBottom = 48;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const counts = series.map((d) => d.count || 0);
  const maxVal = Math.max(4, ...counts);

  const points = series.map((item, index) => {
    const x = series.length <= 1
      ? chartWidth / 2
      : paddingX + (index / (series.length - 1)) * innerWidth;
    const y = paddingTop + innerHeight * (1 - (item.count || 0) / maxVal);
    return { x, y, ...item };
  });

  // Generate SVG Line and Area path
  let linePath = '';
  let areaPath = '';

  if (points.length === 1) {
    linePath = `M ${points[0].x - 30} ${points[0].y} L ${points[0].x + 30} ${points[0].y}`;
    areaPath = `M ${points[0].x - 30} ${points[0].y} L ${points[0].x + 30} ${points[0].y} L ${points[0].x + 30} ${chartHeight - paddingBottom} L ${points[0].x - 30} ${chartHeight - paddingBottom} Z`;
  } else if (points.length > 1) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      linePath += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const last = points[points.length - 1];
    const first = points[0];
    areaPath = `${linePath} L ${last.x} ${chartHeight - paddingBottom} L ${first.x} ${chartHeight - paddingBottom} Z`;
  }

  const yTicks = [0, Math.round(maxVal * 0.5), maxVal];
  const maxSubjectCount = Math.max(1, ...(data.bySubject || []).map((s) => s.count));

  return (
    <section className="teacher-completed-graph-card" aria-label="Completed Sessions Analytics">
      {/* ── Card Header ── */}
      <div className="teacher-graph-header">
        <div className="teacher-graph-header-left">
          <div className="teacher-graph-icon-badge">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <span className="teacher-eyebrow">TEACHING MILESTONES</span>
            <h2>Completed Sessions</h2>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="teacher-graph-tab-group" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'trend'}
            className={`teacher-graph-tab-btn ${activeTab === 'trend' ? 'active' : ''}`}
            onClick={() => setActiveTab('trend')}
          >
            <TrendingUp size={14} /> Trend
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'subjects'}
            className={`teacher-graph-tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => setActiveTab('subjects')}
          >
            <BarChart3 size={14} /> By Subject
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'recent'}
            className={`teacher-graph-tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            <History size={14} /> Recent
          </button>
        </div>
      </div>

      {/* ── Summary Metrics Bar ── */}
      <div className="teacher-graph-summary-bar">
        <div className="teacher-graph-summary-item">
          <span>All-time Completed</span>
          <strong>{data.totalCompleted} <small>sessions</small></strong>
        </div>
        <div className="teacher-graph-summary-divider" />
        <div className="teacher-graph-summary-item">
          <span>Total Hours Taught</span>
          <strong>{data.totalHours} <small>hours</small></strong>
        </div>
        <div className="teacher-graph-summary-divider" />
        <div className="teacher-graph-summary-item">
          <span>Completed This Week</span>
          <strong>{data.thisWeekCount} <small>sessions ({data.thisWeekHours}h)</small></strong>
        </div>
      </div>

      {/* ── Main Tab Content ── */}
      <div className="teacher-graph-body">
        {/* Tab 1: Trend Graph */}
        {activeTab === 'trend' && (
          <div className="teacher-graph-trend-pane">
            <div className="teacher-graph-controls-row">
              <span className="teacher-graph-pane-title">
                {timeRange === '7days' ? 'Past 7 Days Session Flow' : 'Past 6 Months Session Flow'}
              </span>

              <div className="teacher-graph-range-pills">
                <button
                  type="button"
                  className={`teacher-range-pill ${timeRange === '7days' ? 'active' : ''}`}
                  onClick={() => setTimeRange('7days')}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  className={`teacher-range-pill ${timeRange === 'monthly' ? 'active' : ''}`}
                  onClick={() => setTimeRange('monthly')}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="teacher-svg-chart-container">
              <svg
                className="teacher-analytics-svg"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="teacherSessionAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#355c42" stopOpacity="0.32" />
                    <stop offset="85%" stopColor="#355c42" stopOpacity="0.03" />
                    <stop offset="100%" stopColor="#355c42" stopOpacity="0.0" />
                  </linearGradient>

                  <filter id="teacherGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#355c42" floodOpacity="0.35" />
                  </filter>
                </defs>

                {/* Horizontal Gridlines & Y-Axis values */}
                {yTicks.map((val) => {
                  const y = paddingTop + innerHeight * (1 - val / maxVal);
                  return (
                    <g key={val} className="teacher-svg-gridline-group">
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        className="teacher-svg-gridline"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="teacher-svg-axis-label"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Gradient Area Fill */}
                {areaPath && (
                  <path
                    d={areaPath}
                    fill="url(#teacherSessionAreaGrad)"
                    className="teacher-svg-area"
                  />
                )}

                {/* Main Stroke Line */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#355c42"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#teacherGlow)"
                    className="teacher-svg-line"
                  />
                )}

                {/* Interactive Data Dots & X-Labels */}
                {points.map((pt, i) => {
                  const isHovered = hoveredPoint && hoveredPoint.index === i;
                  return (
                    <g
                      key={pt.label || i}
                      className="teacher-svg-node-group"
                      onMouseEnter={() => setHoveredPoint({ ...pt, index: i })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Generous transparent hit area */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="18"
                        fill="transparent"
                        className="teacher-svg-hit-target"
                      />

                      {/* Outer Ring on Hover */}
                      {isHovered && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="10"
                          fill="rgba(53, 92, 66, 0.2)"
                          stroke="#355c42"
                          strokeWidth="1.5"
                          className="teacher-svg-dot-ring"
                        />
                      )}

                      {/* Visible Node */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : 4.5}
                        fill="#355c42"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        className="teacher-svg-dot"
                      />

                      {/* X-Axis Date / Day Label */}
                      <text
                        x={pt.x}
                        y={chartHeight - 16}
                        textAnchor="middle"
                        className={`teacher-svg-x-label ${isHovered ? 'active' : ''}`}
                      >
                        {timeRange === '7days' ? pt.dayName || pt.label : pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Floating Tooltip */}
              {hoveredPoint && (
                <div
                  className="teacher-svg-tooltip"
                  style={{
                    left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                    top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                  }}
                >
                  <div className="teacher-tooltip-title">
                    {hoveredPoint.label} {hoveredPoint.dayName ? `(${hoveredPoint.dayName})` : ''}
                  </div>
                  <div className="teacher-tooltip-metric">
                    <strong>{hoveredPoint.count}</strong> {hoveredPoint.count === 1 ? 'session' : 'sessions'}
                  </div>
                  <div className="teacher-tooltip-sub">
                    <Clock3 size={11} /> {hoveredPoint.hours || 0} teaching hours
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: By Subject */}
        {activeTab === 'subjects' && (
          <div className="teacher-graph-subjects-pane">
            <span className="teacher-graph-pane-title">Completed Sessions Distributed by Subject</span>
            {!data.bySubject || data.bySubject.length === 0 ? (
              <div className="teacher-graph-empty">
                <BookOpen size={28} />
                <p>No completed sessions recorded for your subjects yet.</p>
              </div>
            ) : (
              <div className="teacher-subject-bars-list">
                {data.bySubject.map((subj) => {
                  const pct = Math.round((subj.count / maxSubjectCount) * 100);
                  return (
                    <div key={subj.subject} className="teacher-subject-bar-item">
                      <div className="teacher-subject-bar-header">
                        <strong>{subj.subject}</strong>
                        <div className="teacher-subject-bar-stats">
                          <span>{subj.count} {subj.count === 1 ? 'session' : 'sessions'}</span>
                          <small>({subj.hours}h)</small>
                        </div>
                      </div>
                      <div className="teacher-subject-bar-track">
                        <div
                          className="teacher-subject-bar-fill"
                          style={{ width: `${Math.max(6, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Recent Completed Sessions */}
        {activeTab === 'recent' && (
          <div className="teacher-graph-recent-pane">
            <span className="teacher-graph-pane-title">Latest Completed Lessons</span>
            {!data.recentCompleted || data.recentCompleted.length === 0 ? (
              <div className="teacher-graph-empty">
                <CalendarDays size={28} />
                <p>No completed lessons recorded yet. Completed appointments will be archived here.</p>
              </div>
            ) : (
              <div className="teacher-recent-list">
                {data.recentCompleted.map((session) => (
                  <article key={session._id} className="teacher-recent-card">
                    <div className="teacher-recent-avatar">
                      {session.studentName?.charAt(0) || 'S'}
                    </div>
                    <div className="teacher-recent-details">
                      <strong>{session.subject}</strong>
                      <p>Student: <span>{session.studentName}</span> · {session.time}</p>
                      {session.reviewText && (
                        <blockquote className="teacher-recent-review-quote">
                          "{session.reviewText}"
                        </blockquote>
                      )}
                    </div>
                    <div className="teacher-recent-right">
                      <span className="teacher-recent-duration">
                        <Clock3 size={12} /> {session.hours}h
                      </span>
                      {session.rating && (
                        <span className="teacher-recent-rating">
                          <Star size={13} fill="#f59e0b" color="#f59e0b" />
                          {session.rating}/5
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer Link to Schedules ── */}
      <footer className="teacher-graph-footer">
        <span>Looking to expand your schedule?</span>
        <Link to="/teacher/availability" className="teacher-graph-link">
          Manage Available Hours <ArrowRight size={14} />
        </Link>
      </footer>
    </section>
  );
}
