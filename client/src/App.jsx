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