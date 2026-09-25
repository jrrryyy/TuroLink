import AccountSettings from "./pages/AccountSettings";
import Messages from "./pages/Messages";
import VerifyEmail from './pages/VerifyEmail';
import CompleteGoogle from './pages/CompleteGoogle';
import { FindTutors, TutorDetails, TeacherAvailability, TutorSchedules, TeacherRequests } from './pages/Tutors';
import StudentRateTutors from './pages/StudentRateTutors';
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import StudentDashboard from "./pages/StudentDashboard";
import StudentMySubjects from "./pages/StudentMySubjects";

import TeacherRegister from "./pages/TeacherRegister";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherMySubjects from "./pages/TeacherMySubjects";

import ProtectedRoute from "./components/ProtectedRoute";

import { useAuth } from "./context/AuthContext";


// ============================================
// GUEST ROUTE
// ============================================

const GuestRoute = ({ children }) => {
  const {
    isAuthenticated,
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        Loading TuroLink...
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === "teacher") {
      return (
        <Navigate
          to="/teacher/dashboard"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
};


// ============================================
// APP
// ============================================

function App() {
  return (
    <Routes>
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/complete-google" element={<CompleteGoogle />} />
      <Route path="/student/my-subjects/:id" element={<ProtectedRoute allowedRole="student"><StudentMySubjects /></ProtectedRoute>} />
      <Route path="/teacher/requests" element={<ProtectedRoute allowedRole="teacher"><TeacherRequests /></ProtectedRoute>} />
      <Route path="/student/find-tutors" element={<ProtectedRoute allowedRole="student"><FindTutors /></ProtectedRoute>} />
      <Route path="/student/tutors/:id" element={<ProtectedRoute allowedRole="student"><TutorDetails /></ProtectedRoute>} />
      <Route path="/student/schedules" element={<ProtectedRoute allowedRole="student"><TutorSchedules /></ProtectedRoute>} />
      <Route path="/student/rate-tutors" element={<ProtectedRoute allowedRole="student"><StudentRateTutors /></ProtectedRoute>} />
      <Route path="/teacher/schedules" element={<ProtectedRoute allowedRole="teacher"><TutorSchedules /></ProtectedRoute>} />
      <Route path="/teacher/availability" element={<ProtectedRoute allowedRole="teacher"><TeacherAvailability /></ProtectedRoute>} />
      <Route path="/student/settings" element={<ProtectedRoute allowedRole="student"><AccountSettings /></ProtectedRoute>} />
      <Route path="/teacher/settings" element={<ProtectedRoute allowedRole="teacher"><AccountSettings /></ProtectedRoute>} />
      <Route path="/student/messages" element={<ProtectedRoute allowedRole="student"><Messages /></ProtectedRoute>} />
      <Route path="/teacher/messages" element={<ProtectedRoute allowedRole="teacher"><Messages /></ProtectedRoute>} />

      {/* =====================================
          PUBLIC
      ====================================== */}

      <Route
        path="/"
        element={<Home />}
      />


      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />


      <Route
        path="/register"
        element={
          <GuestRoute>
            <Register />
          </GuestRoute>
        }
      />


      <Route
        path="/teacher/register"
        element={
          <GuestRoute>
            <TeacherRegister />
          </GuestRoute>
        }
      />


      {/* =====================================
          STUDENT ONLY
      ====================================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRole="student"
          >
            <StudentDashboard />
          </ProtectedRoute>
        }
      />


      <Route
        path="/student/my-subjects"
        element={
          <ProtectedRoute
            allowedRole="student"
          >
            <StudentMySubjects />
          </ProtectedRoute>
        }
      />


      {/* =====================================
          TEACHER ONLY
      ====================================== */}

      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute
            allowedRole="teacher"
          >
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />


      <Route
        path="/teacher/my-subjects"
        element={
          <ProtectedRoute
            allowedRole="teacher"
          >
            <TeacherMySubjects />
          </ProtectedRoute>
        }
      />


      {/* =====================================
          UNKNOWN ROUTE
      ====================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}

export default App;
