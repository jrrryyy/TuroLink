import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({
  children,
  allowedRole,
}) => {
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

  // Not logged in
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // Role checks
  if (allowedRole) {
    // Admin has dual access to all student, teacher, and admin views
    if (user.role === "admin") {
      return children;
    }

    if (user.role !== allowedRole) {
      if (user.role === "teacher") {
        return (
          <Navigate
            to="/teacher/dashboard"
            replace
          />
        );
      }

      if (user.role === "student") {
        return (
          <Navigate
            to="/dashboard"
            replace
          />
        );
      }

      return (
        <Navigate
          to="/"
          replace
        />
      );
    }
  }

  return children;
};

export default ProtectedRoute;