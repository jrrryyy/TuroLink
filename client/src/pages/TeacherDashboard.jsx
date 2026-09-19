import {
  useEffect,
  useState,
} from "react";

import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  CalendarDays,
  ClipboardList,
  Search,
  Settings,
  Sun,
  Moon,
  LogOut,
  Users,
  Clock3,
  Star,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/teacher.css";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // SAME DARK MODE AS STUDENT DASHBOARD
  const [darkMode, setDarkMode] =
    useState(false);

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get(
          "/teacher/dashboard-data"
        );

        setData(response.data);
      } catch (error) {
        console.error(
          "Teacher dashboard:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const confirmLogout = () => {
    setShowLogoutModal(false);

    logout();

    navigate("/");
  };

  if (loading) {
    return (
      <div className="dashboard-loader">
        Loading teacher dashboard...
      </div>
    );
  }

  const teacher = data?.teacher || {};
  const statistics = data?.statistics || {};
  const schedules = data?.schedules || [];
  const requests = data?.requests || [];
  const messages = data?.messages || [];

  return (
    <div
      className={
        darkMode
          ? "dashboard dark-dashboard teacher-dashboard"
          : "dashboard teacher-dashboard"
      }
    >

      {/* SIDEBAR */}

      <aside className="teacher-sidebar">

        <div className="teacher-logo">
          TuroLink
        </div>

        <nav className="teacher-navigation">

          <button className="teacher-nav-item active">
            <LayoutDashboard size={20} />
            Dashboard
          </button>

          <button className="teacher-nav-item">
            <BookOpen size={20} />
            My Subjects
          </button>

          <button className="teacher-nav-item">
            <MessageCircle size={20} />
            Messages
          </button>

          <button className="teacher-nav-item">
            <CalendarDays size={20} />
            Schedules
          </button>

          <button className="teacher-nav-item">
            <ClipboardList size={20} />

            Request

            {requests.length > 0 && (
              <span className="request-count">
                {requests.length}
              </span>
            )}
          </button>

        </nav>

        <div className="teacher-sidebar-bottom">

          <button
            type="button"
            className="teacher-nav-item teacher-logout"
            onClick={() =>
              setShowLogoutModal(true)
            }
          >
            <LogOut size={20} />
            Log Out
          </button>

        </div>
      </aside>

      {/* BODY */}

      <div className="teacher-dashboard-body">

        {/* HEADER */}

        <header className="teacher-header">

          <div className="teacher-search">

            <Search size={19} />

            <input
              type="text"
              placeholder="Search Courses..."
            />

          </div>

          <div className="teacher-profile-area">

            {/* COPIED DARK MODE */}

            <div className="header-theme-control">

              <Sun size={17} />

              <button
                type="button"
                className={
                  darkMode
                    ? "theme-switch enabled"
                    : "theme-switch"
                }
                onClick={() =>
                  setDarkMode(!darkMode)
                }
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

            <div className="teacher-avatar">
              {teacher.name
                ?.charAt(0)
                ?.toUpperCase() || "T"}
            </div>

            <div className="teacher-profile-copy">
              <strong>
                {teacher.name || "Teacher"}
              </strong>

              <span>Teacher</span>
            </div>

          </div>

        </header>

        {/* MAIN */}

        <main className="teacher-main">

          {/* WELCOME */}

          <section className="teacher-welcome">

            <div>
              <span>TEACHER DASHBOARD</span>

              <h1>
                Welcome Back,{" "}
                {teacher.name || "Teacher"}!
              </h1>

              <p>
                Here's what's happening with
                your classes today.
              </p>
            </div>

          </section>

          {/* STATISTICS */}

          <section>

            <div className="teacher-section-heading">
              STATISTICS OVERVIEW
            </div>

            <div className="teacher-stat-grid">

              <div className="teacher-stat-card">
                <Users size={22} />

                <span>ACTIVE STUDENTS</span>

                <strong>
                  {statistics.activeStudents || 0}{" "}
                  Learners
                </strong>
              </div>

              <div className="teacher-stat-card">
                <Clock3 size={22} />

                <span>
                  WEEKLY HOURS TAUGHT
                </span>

                <strong>
                  {statistics.weeklyHours || 0}{" "}
                  Hours
                </strong>
              </div>

              <div className="teacher-stat-card">
                <BookOpen size={22} />

                <span>ACTIVE SUBJECTS</span>

                <strong>
                  {statistics.activeSubjects || 0}{" "}
                  Courses
                </strong>
              </div>

              <div className="teacher-stat-card">
                <Star size={22} />

                <span>AVERAGE RATING</span>

                <strong>
                  {statistics.totalRatings > 0
                    ? `${statistics.averageRating}/5`
                    : "No ratings yet"}
                </strong>
              </div>

            </div>

          </section>

          <div className="teacher-content-grid">

            {/* SCHEDULE */}

            <section className="teacher-dashboard-card">

              <div className="teacher-card-title">
                TODAY'S TEACHING SCHEDULE
              </div>

              {schedules.length === 0 ? (
                <div className="teacher-empty-state">
                  No classes scheduled today.
                </div>
              ) : (
                schedules.map(
                  (schedule, index) => (
                    <div
                      className="teacher-class-card"
                      key={index}
                    >
                      <div>
                        <span>SUBJECT</span>

                        <h3>
                          {schedule.subject}
                        </h3>

                        <p>
                          {schedule.time}
                        </p>
                      </div>

                      <div className="teacher-class-actions">

                        <button className="teacher-view-button">
                          View Students
                        </button>

                        <button className="teacher-start-button">
                          Start Class
                        </button>

                      </div>
                    </div>
                  )
                )
              )}

            </section>

            {/* RIGHT */}

            <div className="teacher-right-column">

              <section className="teacher-dashboard-card">

                <div className="teacher-card-title">
                  PENDING REQUESTS & MESSAGES
                </div>

                {requests.length === 0 ? (
                  <div className="teacher-empty-state">
                    No pending requests.
                  </div>
                ) : (
                  requests.map(
                    (request, index) => (
                      <div
                        className="teacher-request"
                        key={index}
                      >
                        <strong>
                          One on One Session
                          Request
                        </strong>

                        <p>
                          From:{" "}
                          {request.studentName}
                        </p>

                        <p>
                          Subject:{" "}
                          {request.subject}
                        </p>

                        <p>
                          Time: {request.time}
                        </p>

                        <div className="teacher-request-actions">

                          <button className="teacher-decline-button">
                            Decline
                          </button>

                          <button className="teacher-accept-button">
                            Accept
                          </button>

                        </div>
                      </div>
                    )
                  )
                )}

              </section>

              <section className="teacher-dashboard-card">

                <div className="teacher-card-title">
                  UNREAD MESSAGES
                </div>

                {messages.filter(
                  (message) => message.unread
                ).length === 0 ? (
                  <div className="teacher-empty-state">
                    No unread messages.
                  </div>
                ) : (
                  messages
                    .filter(
                      (message) =>
                        message.unread
                    )
                    .map(
                      (message, index) => (
                        <div
                          className="teacher-message"
                          key={index}
                        >
                          <strong>
                            {message.studentName}
                          </strong>

                          <p>
                            {message.message}
                          </p>

                          <button>
                            Reply in Chat
                          </button>
                        </div>
                      )
                    )
                )}

              </section>

            </div>

          </div>

        </main>

      </div>

      {/* LOGOUT CONFIRMATION */}

      {showLogoutModal && (
        <div
          onClick={() =>
            setShowLogoutModal(false)
          }
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 999999,
            backgroundColor:
              "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter:
              "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "420px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "35px 32px",
              boxShadow:
                "0 25px 70px rgba(0, 0, 0, 0.30)",
              textAlign: "center",
              color: "#29392b",
            }}
          >
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

            <h2
              style={{
                margin: "0 0 10px",
                color: "#335035",
                fontFamily:
                  '"DM Serif Display", serif',
                fontSize: "30px",
                fontWeight: "400",
              }}
            >
              Log out of TuroLink?
            </h2>

            <p
              style={{
                margin: "0 auto 28px",
                maxWidth: "310px",
                color: "#718071",
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              Are you sure you want to log
              out of your teacher account?
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowLogoutModal(false)
                }
                style={{
                  flex: 1,
                  height: "48px",
                  borderRadius: "999px",
                  border:
                    "1px solid #335035",
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
                  border:
                    "1px solid #335035",
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

export default TeacherDashboard;