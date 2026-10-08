import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock3,
  CalendarDays,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import '../styles/student-history-graph.css';

export default function StudentSessionHistoryGraph({ sessionHours, sessionAnalytics }) {
  const [activeMetric, setActiveMetric] = useState('hours'); // 'hours' | 'sessions'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Normalize monthly data
  const months = (sessionAnalytics?.monthly && sessionAnalytics.monthly.length > 0)
    ? sessionAnalytics.monthly
    : (sessionHours || []);

  const totalHours = sessionAnalytics?.totalHours ?? Math.round(months.reduce((s, m) => s + (Number(m.hours) || 0), 0) * 10) / 10;
  const totalSessions = sessionAnalytics?.totalSessions ?? months.reduce((s, m) => s + (Number(m.sessions) || 0), 0);
  const avgMonthlyHours = sessionAnalytics?.avgMonthlyHours ?? (months.length ? Math.round((totalHours / months.length) * 10) / 10 : 0);
  const peakMonth = sessionAnalytics?.peakMonth && sessionAnalytics.peakMonth !== 'N/A'
    ? sessionAnalytics.peakMonth
    : (months.find((m) => Number(m.hours) > 0)?.month || '—');

  const hasActivity = totalHours > 0 || totalSessions > 0;

  // Chart Geometry
  const chartWidth = 520;
  const chartHeight = 180;
  const paddingLeft = 40;
  const paddingRight = 24;
  const paddingTop = 26;
  const paddingBottom = 34;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const currentValues = months.map((m) => (activeMetric === 'hours' ? (Number(m.hours) || 0) : (Number(m.sessions) || 0)));
  const rawMax = Math.max(...currentValues, 0);
  // Sensible max ceiling so bars look proportional
  const maxValue = rawMax === 0 ? (activeMetric === 'hours' ? 5 : 4) : Math.ceil(rawMax * 1.25);

  const colWidth = Math.min(36, Math.max(22, (plotWidth / (months.length || 1)) * 0.48));
  const stepX = months.length > 1 ? plotWidth / (months.length - 1) : plotWidth / 2;

  // Calculate points for trend line and bar geometry
  const bars = months.map((item, idx) => {
    const val = activeMetric === 'hours' ? (Number(item.hours) || 0) : (Number(item.sessions) || 0);
    const xCenter = paddingLeft + (months.length > 1 ? idx * stepX : plotWidth / 2);
    const height = maxValue > 0 ? (val / maxValue) * plotHeight : 0;
    const yTop = paddingTop + (plotHeight - height);
    return {
      index: idx,
      item,
      val,
      xCenter,
      xBar: xCenter - colWidth / 2,
      yTop,
      height: Math.max(height, val > 0 ? 4 : 0),
    };
  });

  // Spline path for connecting points
  let trendPath = '';
  if (bars.length > 1 && hasActivity) {
    trendPath = `M ${bars[0].xCenter} ${bars[0].yTop}`;
    for (let i = 0; i < bars.length - 1; i++) {
      const p0 = bars[i];
      const p1 = bars[i + 1];
      const cpX = (p0.xCenter + p1.xCenter) / 2;
      trendPath += ` C ${cpX} ${p0.yTop}, ${cpX} ${p1.yTop}, ${p1.xCenter} ${p1.yTop}`;
    }
  }

  // Y-axis ticks
  const yTicks = [
    0,
    Math.round(maxValue * 0.5 * 10) / 10,
    maxValue,
  ];

  return (
    <section className="student-panel student-history-redesigned" aria-labelledby="student-history-heading">
      <div className="student-history-top-row">
        <div className="student-history-title-wrap">
          <span className="student-eyebrow">ACTIVITY & CONTINUITY</span>
          <h2 id="student-history-heading">Session History</h2>
        </div>

        {/* Metric Mode Switcher */}
        {hasActivity && (
          <div className="student-history-metric-toggle" role="group" aria-label="Toggle metric view">
            <button
              type="button"
              className={`student-metric-toggle-btn ${activeMetric === 'hours' ? 'active' : ''}`}
              onClick={() => setActiveMetric('hours')}
            >
              <Clock3 size={13} /> Hours
            </button>
            <button
              type="button"
              className={`student-metric-toggle-btn ${activeMetric === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveMetric('sessions')}
            >
              <CalendarDays size={13} /> Lessons
            </button>
          </div>
        )}
      </div>

      {hasActivity ? (
        <>
          {/* Summary Chips Strip */}
          <div className="student-history-summary-strip">
            <div className="student-history-summary-chip">
              <span className="chip-label">Total Time</span>
              <strong className="chip-val">{totalHours}h</strong>
            </div>
            <div className="student-history-summary-divider" />
            <div className="student-history-summary-chip">
              <span className="chip-label">Total Lessons</span>
              <strong className="chip-val">{totalSessions}</strong>
            </div>
            <div className="student-history-summary-divider" />
            <div className="student-history-summary-chip">
              <span className="chip-label">Monthly Avg</span>
              <strong className="chip-val">{avgMonthlyHours}h</strong>
            </div>
            <div className="student-history-summary-divider" />
            <div className="student-history-summary-chip">
              <span className="chip-label">Peak</span>
              <strong className="chip-val accent">{peakMonth}</strong>
            </div>
          </div>

          {/* SVG Chart */}
          <div className="student-history-svg-wrapper">
            <svg
              className="student-history-svg"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="studentHistoryBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#274c33" />
                  <stop offset="60%" stopColor="#355e3e" />
                  <stop offset="100%" stopColor="#4f7a59" />
                </linearGradient>

                <linearGradient id="studentHistoryHoverGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8c6d48" />
                  <stop offset="100%" stopColor="#b38f62" />
                </linearGradient>

                <filter id="studentBarGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#274c33" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Gridlines & Y Axis Labels */}
              {yTicks.map((tickVal) => {
                const y = paddingTop + plotHeight * (1 - tickVal / (maxValue || 1));
                return (
                  <g key={tickVal} className="student-history-grid-group">
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      className="student-history-gridline"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="student-history-tick-label"
                    >
                      {tickVal}{activeMetric === 'hours' ? 'h' : ''}
                    </text>
                  </g>
                );
              })}

              {/* Trend connecting spline (when > 1 bar) */}
              {trendPath && (
                <path
                  d={trendPath}
                  fill="none"
                  stroke="rgba(140, 109, 72, 0.45)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  className="student-history-trend-line"
                />
              )}

              {/* Bar Columns */}
              {bars.map((bar) => {
                const isHovered = hoveredIndex === bar.index;
                const isPeak = bar.item.month === peakMonth && bar.val > 0;
                return (
                  <g
                    key={bar.item.month + bar.index}
                    className="student-history-column-group"
                    onMouseEnter={() => setHoveredIndex(bar.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Background track column */}
                    <rect
                      x={bar.xBar}
                      y={paddingTop}
                      width={colWidth}
                      height={plotHeight}
                      rx={8}
                      className="student-history-bg-track"
                    />

                    {/* Active Filled Bar */}
                    {bar.val > 0 && (
                      <rect
                        x={bar.xBar}
                        y={bar.yTop}
                        width={colWidth}
                        height={bar.height}
                        rx={8}
                        fill={isHovered ? 'url(#studentHistoryHoverGrad)' : (isPeak ? '#8c6d48' : 'url(#studentHistoryBarGrad)')}
                        filter="url(#studentBarGlow)"
                        className={`student-history-fill-bar ${isHovered ? 'hovered' : ''} ${isPeak ? 'peak' : ''}`}
                      />
                    )}

                    {/* Value indicator dot on top */}
                    {bar.val > 0 && (
                      <circle
                        cx={bar.xCenter}
                        cy={bar.yTop}
                        r={isHovered ? 4.5 : 3}
                        fill="#ffffff"
                        stroke={isHovered ? '#8c6d48' : '#274c33'}
                        strokeWidth="2"
                      />
                    )}

                    {/* X-Axis Month Label */}
                    <text
                      x={bar.xCenter}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      className={`student-history-x-label ${isHovered ? 'active' : ''} ${isPeak ? 'peak-label' : ''}`}
                    >
                      {bar.item.month}
                    </text>

                    {/* Invisible Hit Area for Easy Hovering */}
                    <rect
                      x={bar.xCenter - stepX / 2}
                      y={0}
                      width={stepX}
                      height={chartHeight}
                      fill="transparent"
                      className="student-history-hit-target"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Floating Tooltip */}
            {hoveredIndex !== null && bars[hoveredIndex] && (
              <div
                className="student-history-tooltip"
                style={{
                  left: `${(bars[hoveredIndex].xCenter / chartWidth) * 100}%`,
                  top: `${(bars[hoveredIndex].yTop / chartHeight) * 100}%`,
                }}
              >
                <div className="tooltip-month">
                  {bars[hoveredIndex].item.fullMonth || bars[hoveredIndex].item.month}
                </div>
                <div className="tooltip-metric">
                  <strong>{bars[hoveredIndex].item.hours || 0}h</strong>
                  <span>tutoring study time</span>
                </div>
                <div className="tooltip-sub">
                  <CalendarDays size={11} /> {bars[hoveredIndex].item.sessions || 0} completed lessons
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="student-history-empty-card">
          <div className="student-history-empty-icon-wrap">
            <Clock3 size={28} />
          </div>
          <h3>No study sessions recorded yet</h3>
          <p>
            Your monthly hours and learning milestones will appear here once you complete scheduled tutoring sessions.
          </p>
          <Link to="/student/find-tutors" className="student-primary-button compact">
            Find a tutor <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </section>
  );
}
