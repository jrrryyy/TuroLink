import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const StudentDashboard = () => {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useAuth();

  const [data, setData] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [darkMode, setDarkMode] =
    useState(false);

  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const [calendarDate, setCalendarDate] =
    useState(new Date());

  // ==========================================
  // LOAD DASHBOARD DATA
  // ==========================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get(
          "/student/dashboard-data"
        );

        setData(response.data);
      } catch (error) {
        console.error(
          "Dashboard error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // ==========================================
  // CALENDAR
  // ==========================================

  const calendar = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay =
      new Date(year, month, 1).getDay();

    const totalDays =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    return {
      year,
      month,
      firstDay,
      totalDays,
    };
  }, [calendarDate]);

  const changeMonth = (amount) => {
    setCalendarDate(
      new Date(
        calendar.year,
        calendar.month + amount,
        1
      )
    );
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);

    logout();

    navigate("/");
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="page-loader">
        Loading your dashboard...
      </div>
    );
  }

  // ==========================================
  // DASHBOARD DATA
  // ==========================================

  const student =
    data?.student || user || {};

  const courses =
    data?.enrolledCourses || [];

  const sessions =
    data?.sessionHours || [];

  const upcoming =
    data?.upcomingClasses?.[0];

  const maxHours = Math.max(
    ...sessions.map(
      (item) => item.hours
    ),
    1
  );

  const monthName =
    calendarDate.toLocaleString(
      "en-US",
      {
        month: "long",
      }
    );

  const today = new Date();

  // ==========================================
  // DASHBOARD
  // ==========================================

  return (
    <div
      className={
        darkMode
          ? "dashboard dark-dashboard"
          : "dashboard"
      }
    >
      {/* =====================================
          SIDEBAR
      ====================================== */}

      <aside
        className={
          sidebarOpen
            ? "dashboard-sidebar sidebar-open"
            : "dashboard-sidebar"
        }
      >
        <div className="sidebar-top">
          <div className="dashboard-logo">
            TuroLink
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={() =>
              setSidebarOpen(false)
            }
            aria-label="Close sidebar"
          >
            <X />
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className="sidebar-item active"
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>

          <button
            type="button"
            className="sidebar-item"
          >
            <BookOpen size={20} />
            My Courses
          </button>

          <button
            type="button"
            className="sidebar-item"
          >
            <CalendarDays size={20} />
            Schedules
          </button>

          <button
            type="button"
            className="sidebar-item"
          >
            <Settings size={20} />
            Settings
          </button>
        </nav>

        <div className="sidebar-bottom">

          {/* LOGOUT */}

          <button
            type="button"
            className="sidebar-item logout-button"
            onClick={
              handleLogoutClick
            }
          >
            <LogOut size={20} />
            Log Out
          </button>
        </div>
      </aside>

      {/* =====================================
          DASHBOARD BODY
      ====================================== */}

      <div className="dashboard-body">

        {/* HEADER */}

        <header className="dashboard-header">
          <button
            type="button"
            className="mobile-menu"
            onClick={() =>
              setSidebarOpen(true)
            }
            aria-label="Open sidebar"
          >
            <Menu />
          </button>

          {/* SEARCH */}

          <div className="dashboard-search">
            <Search size={19} />

            <input
              type="text"
              placeholder="Search Courses..."
            />
          </div>

          {/* PROFILE */}

      <div className="profile-area">
            {/* DARK MODE */}
            <div className="header-theme-control">
              <Sun size={17} />

              <button
                type="button"
                className={
                  darkMode
                    ? "theme-switch enabled"
                    : "theme-switch"
                }
                onClick={() => setDarkMode(!darkMode)}
                aria-label="Toggle dark mode"
              >
                <span></span>
              </button>

              <Moon size={17} />
            </div>

            {/* SETTINGS */}
            <button
              type="button"
              className="icon-button"
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>

            {/* PROFILE */}
            <div className="profile-avatar">
              {student.name
                ?.charAt(0)
                ?.toUpperCase() || "S"}
            </div>

            <div className="profile-copy">
              <strong>
                {student.name || "Student"}
              </strong>

              <span>Learner</span>
            </div>
          </div>
        </header>

        {/* =====================================
            MAIN CONTENT
        ====================================== */}

        <main className="dashboard-main">

          {/* WELCOME */}

          <section className="welcome-banner">
            <div>
              <span className="welcome-label">
                STUDENT DASHBOARD
              </span>

              <h1>
                Welcome Back,{" "}
                {student.name
                  ?.split(" ")[0] ||
                  "Student"}
                !
              </h1>

              <p>
                Keep building your
                knowledge one session at
                a time.
              </p>
            </div>

            <div className="welcome-circle">
              <BookOpen size={42} />
            </div>
          </section>

          {/* =====================================
              CLASSES TODAY
          ====================================== */}

          <section className="classes-card">
            <div>
              <span className="card-label">
                CLASSES TODAY
              </span>

              <h2>
                {upcoming?.subject ||
                  "No class scheduled"}
              </h2>

              {upcoming && (
                <p>
                  {upcoming.time}
                  {" · "}
                  {upcoming.tutor}
                </p>
              )}
            </div>

            {upcoming && (
              <button
                type="button"
                className="btn btn-primary"
              >
                Session Details
              </button>
            )}
          </section>

          {/* =====================================
              DASHBOARD GRID
          ====================================== */}

          <div className="dashboard-grid">

            {/* ===================================
                ENROLLED COURSES
            ==================================== */}

            <section className="dashboard-card courses-card">
              <div className="card-heading">
                <div>
                  <span className="card-label">
                    YOUR LEARNING
                  </span>

                  <h2>
                    Enrolled Subjects
                  </h2>
                </div>

                <BookOpen size={24} />
              </div>

              <div className="course-list">
                {courses.length > 0 ? (
                  courses.map(
                    (
                      course,
                      index
                    ) => (
                      <div
                        className="course-row"
                        key={`${course.name}-${index}`}
                      >
                        <div className="course-icon">
                          {course.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            "C"}
                        </div>

                        <div className="course-info">
                          <div className="course-title">
                            <strong>
                              {
                                course.name
                              }
                            </strong>

                            <span>
                              {
                                course.progress
                              }
                              %
                            </span>
                          </div>

                          <div className="course-progress">
                            <div
                              style={{
                                width: `${course.progress}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <p>
                    No enrolled subjects
                    yet.
                  </p>
                )}
              </div>
            </section>

            {/* ===================================
                SESSION HISTORY
            ==================================== */}

            <section className="dashboard-card chart-card">
              <div className="card-heading">
                <div>
                  <span className="card-label">
                    ACTIVITY
                  </span>

                  <h2>
                    Session History
                  </h2>
                </div>
              </div>

              <div className="bar-chart">
                {sessions.map(
                  (
                    session,
                    index
                  ) => (
                    <div
                      className="bar-item"
                      key={`${session.month}-${index}`}
                    >
                      <div className="bar-space">
                        <div
                          className="chart-bar"
                          style={{
                            height: `${
                              (session.hours /
                                maxHours) *
                              100
                            }%`,
                          }}
                        >
                          <span>
                            {
                              session.hours
                            }
                            h
                          </span>
                        </div>
                      </div>

                      <small>
                        {session.month}
                      </small>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* ===================================
                CALENDAR
            ==================================== */}

            <section className="dashboard-card calendar-card">
              <div className="calendar-header">
                <div>
                  <span className="card-label">
                    SCHEDULE
                  </span>

                  <h2>
                    {monthName}{" "}
                    {calendar.year}
                  </h2>
                </div>

                <div className="calendar-actions">
                  <button
                    type="button"
                    onClick={() =>
                      changeMonth(-1)
                    }
                    aria-label="Previous month"
                  >
                    <ChevronLeft
                      size={18}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeMonth(1)
                    }
                    aria-label="Next month"
                  >
                    <ChevronRight
                      size={18}
                    />
                  </button>
                </div>
              </div>

              {/* DAYS */}

              <div className="calendar-grid calendar-days">
                {[
                  "S",
                  "M",
                  "T",
                  "W",
                  "T",
                  "F",
                  "S",
                ].map(
                  (
                    day,
                    index
                  ) => (
                    <span
                      key={index}
                    >
                      {day}
                    </span>
                  )
                )}
              </div>

              {/* DATES */}

              <div className="calendar-grid">
                {Array.from({
                  length:
                    calendar.firstDay,
                }).map(
                  (_, index) => (
                    <span
                      key={`empty-${index}`}
                    ></span>
                  )
                )}

                {Array.from({
                  length:
                    calendar.totalDays,
                }).map(
                  (_, index) => {
                    const day =
                      index + 1;

                    const isToday =
                      day ===
                        today.getDate() &&
                      calendar.month ===
                        today.getMonth() &&
                      calendar.year ===
                        today.getFullYear();

                    return (
                      <button
                        type="button"
                        key={day}
                        className={
                          isToday
                            ? "calendar-date today"
                            : "calendar-date"
                        }
                      >
                        {day}
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* =====================================
          LOGOUT CONFIRMATION
      ====================================== */}

     {showLogoutModal && (
  <div
    onClick={cancelLogout}
    style={{
      position: "fixed",
      inset: 0,
      width: "100vw",
      height: "100vh",
      zIndex: 999999,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      backdropFilter: "blur(4px)",
      WebkitBackdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      boxSizing: "border-box",
    }}
  >
    <div
      onClick={(event) => event.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: "420px",
        backgroundColor: "#ffffff",
        borderRadius: "24px",
        padding: "35px 32px",
        boxShadow: "0 25px 70px rgba(0, 0, 0, 0.30)",
        textAlign: "center",
        color: "#29392b",
      }}
    >
      {/* ICON */}
      <div
        style={{
          width: "65px",
          height: "65px",
          margin: "0 auto 20px",
          borderRadius: "50%",
          backgroundColor: "#e8e4d8",
          color: "#335035",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LogOut size={28} />
      </div>

      {/* TITLE */}
      <h2
        style={{
          margin: "0 0 10px",
          color: "#335035",
          fontFamily: '"DM Serif Display", serif',
          fontSize: "30px",
          fontWeight: "400",
        }}
      >
        Log out of TuroLink?
      </h2>

      {/* MESSAGE */}
      <p
        style={{
          margin: "0 auto 28px",
          maxWidth: "310px",
          color: "#718071",
          fontSize: "14px",
          lineHeight: "1.6",
        }}
      >
        Are you sure you want to log out of your account?
      </p>

      {/* BUTTONS */}
      <div
        style={{
          display: "flex",
          gap: "12px",
        }}
      >
        <button
          type="button"
          onClick={cancelLogout}
          style={{
            flex: 1,
            height: "48px",
            borderRadius: "999px",
            border: "1px solid #335035",
            backgroundColor: "#ffffff",
            color: "#335035",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={confirmLogout}
          style={{
            flex: 1,
            height: "48px",
            borderRadius: "999px",
            border: "1px solid #335035",
            backgroundColor: "#335035",
            color: "#ffffff",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
          }}
        >
          <LogOut size={17} />
          Log Out
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default StudentDashboard;