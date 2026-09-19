import { useState } from "react";

import {
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!email || !password) {
      setError(
        "Please enter your email and password."
      );

      return;
    }

    try {
      setLoading(true);

      await login(email, password);

      const redirect =
        searchParams.get("redirect") ||
        "/dashboard";

      navigate(redirect);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to log in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-brand-panel">
        <Link to="/" className="auth-back">
          <ArrowLeft size={18} />
          Back
        </Link>

        <div className="auth-brand-content">
          <h1>TuroLink</h1>

          <p>
            Welcome back.
            <br />
            Keep learning.
          </p>
        </div>

        <div className="auth-decoration">
          <div className="auth-circle-one"></div>
          <div className="auth-circle-two"></div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container login-container">
          <div className="auth-heading">
            <span className="section-label">
              WELCOME BACK
            </span>

            <h2>Log In</h2>

            <p>
              Sign in to access your student
              dashboard.
            </p>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >
            <label>
              Email Address

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />
            </label>

            <label>
              Password

              <div className="password-field">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading
                ? "Logging In..."
                : "Log In"}
            </button>
          </form>

          <div className="auth-footer-card">
            Don't have an account?

            <Link to="/register">
              Sign Up
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;