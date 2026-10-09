import { profilePictureUrl } from "../services/profile";
import StudentNotifications from './StudentNotifications';
import UserProfileModal from './UserProfileModal';
import ProfileSupportModals from './ProfileSupportModals';
import '../styles/view-profile-modal.css';
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
  Bell,
  Sun,
  ShieldCheck,
  Users,
  Sparkles,
  Globe,
  Headphones,
  HelpCircle,
  MessageSquare,
  Bug,
  ChevronRight,
  ChevronDown,
  User,
  ShieldAlert,
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
import '../styles/admin-modern.css';

const DashboardLayout = ({
  role = "student",
  userName = "",
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
    showLogoutModal,
    setShowLogoutModal,
  ] = useState(false);

  const [
    showProfileMenu,
    setShowProfileMenu,
  ] = useState(false);

  const [
    showUserProfile,
    setShowUserProfile,
  ] = useState(false);

  const [
    activeModal,
    setActiveModal,
  ] = useState(null);

  const profileMenuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => { setSidebarOpen(false); menuButtonRef.current?.focus(); };
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setShowProfileMenu(false);
        setActiveModal(null);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);
  const [navigationNotice, setNavigationNotice] = useState("");

  const userRole = user?.role || role;
  const isAdmin = userRole === "admin";
  const isTeacher = role === "teacher";
  const isAdminView = role === "admin" || location.pathname.startsWith("/admin");
  const dashboardPath = isAdminView ? "/admin/dashboard" : isTeacher ? "/teacher/dashboard" : "/dashboard";
  const settingsPath = isAdmin ? "/admin/settings" : isTeacher ? "/teacher/settings" : "/student/settings";

  const displayName =
    userName || user?.name ||
    (isAdmin
      ? "Admin"
      : isTeacher
        ? "Teacher"
        : "Student");

  const firstLetter =
    displayName
      .charAt(0)
      .toUpperCase() || "U";

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
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
    setShowProfileMenu(false);

    try { await logout(); navigate('/'); }
    catch { setNavigationNotice('Unable to sign out. Check your connection and try again.'); }
  };

  return (
    <div
      className={`dashboard-layout ${isAdminView ? "admin-layout" : isTeacher ? "teacher-layout" : "student-layout"} ${darkMode ? "dark-dashboard-layout" : ""} ${sidebarOpen ? "dashboard-sidebar-open" : ""}`}
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
          {(isAdminView ? [
            { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
            { label: "User Management", icon: Users, path: "/admin/users" },
            { label: "Reports & Complaints", icon: ShieldAlert, path: "/admin/reports" },
            { label: "Teacher Approvals", icon: ShieldCheck, path: "/admin/teachers" },
            { label: "Platform Subjects", icon: BookOpen, path: "/admin/subjects" },
            { label: "All Bookings", icon: CalendarDays, path: "/admin/bookings" },
            { label: "Messages", icon: MessageCircle, path: "/student/messages" },
          ] : [
            { label: "Dashboard", icon: LayoutDashboard, path: isTeacher ? "/teacher/dashboard" : "/dashboard" },
            { label: "My Subjects", icon: BookOpen, path: isTeacher ? "/teacher/my-subjects" : "/student/my-subjects" },
            { label: "Messages", icon: MessageCircle, path: isTeacher ? '/teacher/messages' : '/student/messages' },
            { label: "Schedules", icon: CalendarDays, path: isTeacher ? '/teacher/schedules' : '/student/schedules' },
            ...(isTeacher ? [{ label: 'Request', icon: ClipboardList, path: '/teacher/requests' }] : []),
            ...(isTeacher ? [{ label: 'Availability', icon: CalendarDays, path: '/teacher/availability' }] : [
              { label: 'Find Tutor', icon: Search, path: '/student/find-tutors' },
              { label: 'Rate Tutors', icon: Star, path: '/student/rate-tutors' },
            ]),
          ]).map(({ label, icon: Icon, path }) => (
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
          the Profile dropdown.
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
            {/* NOTIFICATIONS */}
            <StudentNotifications />

            {/* PROFILE DROPDOWN */}
            <div className="dashboard-profile-wrapper" ref={profileMenuRef}>
              <button
                type="button"
                className={`dashboard-layout-user-btn ${showProfileMenu ? "active" : ""}`}
                onClick={() => setShowProfileMenu((prev) => !prev)}
                aria-label="View profile menu"
                aria-expanded={showProfileMenu}
              >
                <div className="dashboard-layout-avatar">
                  {user?.profilePicture ? <img src={profilePictureUrl(user.profilePicture)} alt="" /> : firstLetter}
                </div>

                <div className="dashboard-layout-profile">
                  <strong>{displayName}</strong>
                  <span>{isAdmin ? "Admin" : isTeacher ? "Teacher" : "Student"}</span>
                </div>
                <ChevronDown size={14} className={`dashboard-profile-chevron ${showProfileMenu ? "open" : ""}`} />
              </button>

              {showProfileMenu && (
                <div className="dashboard-profile-dropdown" role="menu">
                  {/* Identity Header */}
                  <div className="dashboard-profile-dropdown-header">
                    <div className="dashboard-profile-avatar-large">
                      {user?.profilePicture ? <img src={profilePictureUrl(user.profilePicture)} alt="" /> : firstLetter}
                    </div>
                    <div className="dashboard-profile-header-info">
                      <strong>{displayName}</strong>
                      <p>{user?.email || "Signed in"}</p>
                      <span className={`dashboard-profile-role-pill ${isTeacher ? 'teacher' : ''}`}>
                        {isTeacher ? "Teacher Account" : isAdmin ? "Administrator" : "Student Account"}
                      </span>
                    </div>
                  </div>

                  <div className="dashboard-profile-quick-actions">
                    <button
                      type="button"
                      className="dashboard-profile-quick-btn"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowUserProfile(true);
                      }}
                    >
                      <User size={13} /> Full Profile
                    </button>
                    <button
                      type="button"
                      className="dashboard-profile-quick-btn"
                      onClick={() => {
                        setShowProfileMenu(false);
                        goTo(settingsPath);
                      }}
                    >
                      <Settings size={13} /> Settings
                    </button>
                  </div>

                  <div className="dashboard-profile-divider" />

                  {/* Section 0: Settings Options */}
                  <div className="dashboard-profile-menu-list">
                    <button
                      type="button"
                      className="dashboard-profile-menu-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        goTo(settingsPath);
                      }}
                    >
                      <div className="dashboard-profile-item-left">
                        <Settings size={17} className="dashboard-profile-item-icon green" />
                        <span>Account Settings</span>
                      </div>
                      <ChevronRight size={15} className="dashboard-profile-item-arrow" />
                    </button>

                    <button
                      type="button"
                      className="dashboard-profile-menu-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        goTo(`${settingsPath}?tab=notifications`);
                      }}
                    >
                      <div className="dashboard-profile-item-left">
                        <Bell size={17} className="dashboard-profile-item-icon green" />
                        <span>Notification Settings</span>
                      </div>
                      <ChevronRight size={15} className="dashboard-profile-item-arrow" />
                    </button>
                  </div>

                  <div className="dashboard-profile-divider" />

                  {/* Section 1: Features & Preferences */}
                  <div className="dashboard-profile-menu-list">
                    <button
                      type="button"
                      className="dashboard-profile-menu-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setActiveModal('whatsNew');
                      }}
                    >
                      <div className="dashboard-profile-item-left">
                        <Sparkles size={17} className="dashboard-profile-item-icon green" />
                        <span>What’s New</span>
                      </div>
                      <ChevronRight size={15} className="dashboard-profile-item-arrow" />
                    </button>

                    <button
                      type="button"
                      className="dashboard-profile-menu-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setActiveModal('language');
                      }}
                    >
                      <div className="dashboard-profile-item-left">
                        <Globe size={17} className="dashboard-profile-item-icon green" />
                        <span>Language</span>
                      </div>
                      <span className="dashboard-profile-badge-text">US English</span>
                    </button>
                  </div>

                  <div className="dashboard-profile-divider" />

                  {/* Section 2: Support Header & Items */}
                  <div className="dashboard-profile-section-title">
                    <Headphones size={15} className="green" />
                    <span>Support</span>
                  </div>

                  <div className="dashboard-profile-menu-list">
                    <button
                      type="button"
                      className="dashboard-profile-menu-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setActiveModal('support');
                      }}
                    >
                      <div className="dashboard-profile-item-left">
                        <HelpCircle size={17} className="dashboard-profile-item-icon" />
                        <span>Support</span>
                      </div>
                      <ChevronRight size={15} className="dashboard-profile-item-arrow" />
                    </button>

                    <button
                      type="button"
                      className="dashboard-profile-menu-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setActiveModal('feedback');
                      }}
                    >
                      <div className="dashboard-profile-item-left">
                        <MessageSquare size={17} className="dashboard-profile-item-icon" />
                        <span>Feedback</span>
                      </div>
                      <ChevronRight size={15} className="dashboard-profile-item-arrow" />
                    </button>

                    <button
                      type="button"
                      className="dashboard-profile-menu-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setActiveModal('reportBug');
                      }}
                    >
                      <div className="dashboard-profile-item-left">
                        <Bug size={17} className="dashboard-profile-item-icon red" />
                        <span>Report a bug</span>
                      </div>
                      <ChevronRight size={15} className="dashboard-profile-item-arrow" />
                    </button>
                  </div>

                  <div className="dashboard-profile-divider" />

                  {/* Sign Out */}
                  <div className="dashboard-profile-menu-list">
                    <button
                      type="button"
                      className="dashboard-profile-menu-item logout"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowLogoutModal(true);
                      }}
                    >
                      <div className="dashboard-profile-item-left">
                        <LogOut size={17} className="dashboard-profile-item-icon" />
                        <span>Log Out</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
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
          {isAdmin && (
            <div className="admin-perspective-banner">
              <div className="admin-perspective-info">
                <div className="admin-perspective-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="admin-perspective-title">Administrator Dual-Role Mode</div>
                  <div className="admin-perspective-subtitle">Switch active viewpoint to test or operate as any role</div>
                </div>
              </div>
              <div className="admin-perspective-pills">
                <button
                  type="button"
                  className={`admin-perspective-pill ${isAdminView ? "active" : ""}`}
                  onClick={() => goTo("/admin/dashboard")}
                >
                  <ShieldCheck size={14} /> Admin Hub
                </button>
                <button
                  type="button"
                  className={`admin-perspective-pill ${!isAdminView && !isTeacher ? "active" : ""}`}
                  onClick={() => goTo("/dashboard")}
                >
                  <Star size={14} /> Student View
                </button>
                <button
                  type="button"
                  className={`admin-perspective-pill ${!isAdminView && isTeacher ? "active" : ""}`}
                  onClick={() => goTo("/teacher/dashboard")}
                >
                  <BookOpen size={14} /> Teacher View
                </button>
              </div>
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

      <UserProfileModal
        user={user}
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
      />

      <ProfileSupportModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        user={user}
        isTeacher={isTeacher}
      />
    </div>
  );
};

export default DashboardLayout;
