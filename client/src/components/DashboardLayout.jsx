import { profilePictureUrl } from "../services/profile";
import StudentNotifications from './StudentNotifications';
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Menu,
  X,
  Moon,
  Search,
  Star,
  Settings,
  Sun,
} from "lucide-react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import "../styles/dashboard-layout.css";
import '../styles/teacher-modern.css';
import '../styles/student-modern.css';

const DashboardLayout = ({
  role = "student",
  userName = "",
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search Courses...",
  requestCount = 0,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { logout, user } = useAuth();

  const {
    darkMode,
    toggleDarkMode,
  } = useTheme();

  const [
    showSettings,
    setShowSettings,
  ] = useState(false);

  const [
    showLogoutModal,
    setShowLogoutModal,
  ] = useState(false);

  const settingsRef = useRef(null);
  const menuButtonRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const closeSidebar = () => { setSidebarOpen(false); menuButtonRef.current?.focus(); };
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setShowSettings(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);
  const [navigationNotice, setNavigationNotice] = useState("");

  const isTeacher =
    role === "teacher";
  const dashboardPath = isTeacher ? "/teacher/dashboard" : "/dashboard";

  const displayName =
    userName || user?.name ||
    (isTeacher
      ? "Teacher"
      : "Student");

  const firstLetter =
    displayName
      .charAt(0)
      .toUpperCase() || "U";

  useEffect(() => {
    const handleOutsideClick = (
      event
    ) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(
          event.target
        )
      ) {
        setShowSettings(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/") || (path === "/student/find-tutors" && location.pathname.startsWith("/student/tutors/"));

  const goTo = (path) => {
    setNavigationNotice("");
    setSidebarOpen(false);
    navigate(path);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    setShowSettings(false);

    try { await logout(); navigate('/'); }
    catch { setNavigationNotice('Unable to sign out. Check your connection and try again.'); }
  };

  return (
    <div
      className={`dashboard-layout ${isTeacher ? "teacher-layout" : "student-layout"} ${darkMode ? "dark-dashboard-layout" : ""} ${sidebarOpen ? "dashboard-sidebar-open" : ""}`}
    >
      {/* =========================================
          SIDEBAR
      ========================================== */}

      <aside id="dashboard-sidebar" className="dashboard-layout-sidebar" inert={!sidebarOpen ? true : undefined}>
        <Link to={dashboardPath} className="dashboard-layout-logo" aria-label="Go to Dashboard" onClick={closeSidebar}>
          <img src="/turolink-logo.png" alt="TuroLink Logo" className="dashboard-sidebar-logo-img" />
          <span>TuroLink</span>
        </Link>

        <nav className="dashboard-layout-nav" aria-label="Main navigation">
          {[
            { label: "Dashboard", icon: LayoutDashboard, path: isTeacher ? "/teacher/dashboard" : "/dashboard" },
            { label: "My Subjects", icon: BookOpen, path: isTeacher ? "/teacher/my-subjects" : "/student/my-subjects" },
            { label: "Messages", icon: MessageCircle },
            { label: "Schedules", icon: CalendarDays, path: isTeacher ? '/teacher/schedules' : '/student/schedules' },
            ...(isTeacher ? [{ label: 'Request', icon: ClipboardList, path: '/teacher/requests' }] : []),
            ...(isTeacher ? [{ label: 'Availability', icon: CalendarDays, path: '/teacher/availability' }] : [
              { label: 'Find Tutor', icon: Search, path: '/student/find-tutors' },
              { label: 'Rate Tutors', icon: Star, path: '/student/rate-tutors' },
            ]),
          ].map(({ label, icon: Icon, path }) => (
            <button key={label} type="button"
              className={path && isActive(path) ? "dashboard-layout-nav-item active" : "dashboard-layout-nav-item"}
              aria-current={path && isActive(path) ? "page" : undefined}
              aria-label={label} title={label}
              onClick={() => {
                if (path) goTo(path);
                else { setNavigationNotice(label + " is not available yet."); setSidebarOpen(false); }
              }}>
              <Icon size={20} />{label}
              {isTeacher && label === "Request" && requestCount > 0 && <span className="dashboard-layout-request-count">{requestCount}</span>}
            </button>
          ))}
        </nav>

        {/*
          IMPORTANT:
          NO LOGOUT BUTTON HERE.

          Logout is now inside
          the Settings dropdown.
        */}
      </aside>
      {sidebarOpen && <button type="button" className="dashboard-sidebar-backdrop" aria-label="Close sidebar" onClick={closeSidebar} />}

      {/* =========================================
          BODY
      ========================================== */}

      <div className="dashboard-layout-body">
        {/* =====================================
            HEADER
        ====================================== */}

        <header className="dashboard-layout-header">
          {<>
            <button type="button" ref={menuButtonRef} className="dashboard-layout-icon-button dashboard-menu-button"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"} aria-expanded={sidebarOpen} aria-controls="dashboard-sidebar"
              onClick={() => setSidebarOpen((open) => !open)}>{sidebarOpen ? <X size={23} /> : <Menu size={23} />}</button>
            <Link to={dashboardPath} className="dashboard-topbar-brand" aria-label="Go to Dashboard">
              <img src="/turolink-logo.png" alt="TuroLink Logo" className="dashboard-topbar-logo-img" />
              <strong>TuroLink</strong>
            </Link>
          </>}
          <form className="dashboard-layout-search" onSubmit={(event) => {
            event.preventDefault();
            if (!onSearchChange) navigate((isTeacher ? "/teacher/my-subjects?q=" : "/student/my-subjects?q=") + encodeURIComponent(headerSearch));
          }}>
            <Search size={19} />

            <input
              type="text"
              value={!onSearchChange ? headerSearch : searchValue}
              aria-label="Search subjects"
              placeholder={
                searchPlaceholder
              }
              onChange={(event) => {
                if (!onSearchChange) setHeaderSearch(event.target.value);
                if (
                  onSearchChange
                ) {
                  onSearchChange(
                    event.target.value
                  );
                }
              }}
            />
          </form>

          <div className="dashboard-layout-header-right">
            {/* DARK MODE */}

            {isActive(isTeacher ? "/teacher/dashboard" : "/dashboard") && (
            <div className="dashboard-layout-theme">
              <Sun size={17} />

              <button
                type="button"
                className={
                  darkMode
                    ? "dashboard-theme-switch enabled"
                    : "dashboard-theme-switch"
                }
                onClick={
                  toggleDarkMode
                }
                role="switch"
                aria-checked={darkMode}
                aria-label="Toggle dark mode"
              >
                <span />
              </button>

              <Moon size={17} />
            </div>
            )}

            {/* ================================
                SETTINGS
            ================================= */}

            <StudentNotifications />
            <div
              className="dashboard-settings-wrapper"
              ref={settingsRef}
            >
              <button
                type="button"
                className="dashboard-layout-icon-button"
                aria-label="Settings"
                onClick={() =>
                  setShowSettings(
                    (previous) =>
                      !previous
                  )
                }
              >
                <Settings
                  size={20}
                />
              </button>

              {showSettings && (
                <div className="dashboard-settings-menu">
                  <div className="dashboard-settings-menu-title">
                    Settings
                  </div>

                  <button
                    type="button"
                    className="dashboard-settings-menu-item"
                    onClick={() => { setShowSettings(false); goTo(isTeacher ? "/teacher/settings" : "/student/settings"); }}
                  >
                    <Settings
                      size={17}
                    />

                    Account Settings
                  </button>

                  <div className="dashboard-settings-menu-divider" />

                  <button
                    type="button"
                    className="dashboard-settings-menu-item logout"
                    onClick={() => {
                      setShowSettings(
                        false
                      );

                      setShowLogoutModal(
                        true
                      );
                    }}
                  >
                    <LogOut
                      size={17}
                    />

                    Log Out
                  </button>
                </div>
              )}
            </div>

            {/* PROFILE */}

            <div className="dashboard-layout-avatar">
              {user?.profilePicture ? <img src={profilePictureUrl(user.profilePicture)} alt="" /> : firstLetter}
            </div>

            <div className="dashboard-layout-profile">
              <strong>
                {displayName}
              </strong>

              <span>
                {isTeacher
                  ? "Teacher"
                  : "Student"}
              </span>
            </div>
          </div>
        </header>

        {/* =====================================
            PAGE CONTENT
        ====================================== */}

        <main className="dashboard-layout-content">
          {navigationNotice && (
            <div className="student-navigation-notice" role="status">
              <span>{navigationNotice}</span>
              <button type="button" onClick={() => setNavigationNotice("")}>Dismiss</button>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* =========================================
          LOGOUT CONFIRMATION
      ========================================== */}

      {showLogoutModal && (
        <div
          className="dashboard-logout-overlay"
          onClick={() =>
            setShowLogoutModal(
              false
            )
          }
        >
          <div
            className="dashboard-logout-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="dashboard-logout-icon">
              <LogOut size={28} />
            </div>

            <h2>
              Log out of TuroLink?
            </h2>

            <p>
              Are you sure you want
              to log out of your{" "}
              {isTeacher
                ? "teacher"
                : "student"}{" "}
              account?
            </p>

            <div className="dashboard-logout-actions">
              <button
                type="button"
                className="dashboard-logout-cancel"
                onClick={() =>
                  setShowLogoutModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="dashboard-logout-confirm"
                onClick={
                  confirmLogout
                }
              >
                <LogOut
                  size={17}
                />

                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
