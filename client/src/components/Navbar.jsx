import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleProtectedNavigation = (path) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      navigate(
        `/login?redirect=${encodeURIComponent(path)}`
      );
    }
  };

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-bold text-indigo-600"
        >
          TuroLink
        </Link>

        {/* Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            to="/"
            className="text-gray-700 hover:text-indigo-600"
          >
            Home
          </Link>

          <Link
            to="/tutors"
            className="text-gray-700 hover:text-indigo-600"
          >
            Find Tutors
          </Link>

          <button
            onClick={() =>
              handleProtectedNavigation("/messages")
            }
            className="text-gray-700 hover:text-indigo-600"
          >
            Messages
          </button>

          <button
            onClick={() =>
              handleProtectedNavigation(
                "/enrolled-subjects"
              )
            }
            className="text-gray-700 hover:text-indigo-600"
          >
            Enrolled Subj
          </button>
        </div>

        {/* Search */}
        <div className="hidden lg:block">
          <input
            type="text"
            placeholder="Search..."
            className="w-48 rounded-full border px-4 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <button className="text-xl">
            🔔
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-full bg-gray-200">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    👤
                  </div>
                )}
              </div>

              <span className="hidden text-sm font-medium sm:block">
                {user?.name}
              </span>

              <button
                onClick={logout}
                className="text-sm text-red-500"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Login
            </Link>
          )}
        </div>

      </nav>
    </header>
  );
};

export default Navbar;