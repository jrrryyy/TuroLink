import GoogleSignIn from '../components/GoogleSignIn';
import { validateLogin, normalizeEmail } from "../../../shared/validation.mjs";
import FieldError from "../components/FieldError";
import "../styles/validation.css";
import { useRef, useState } from "react";

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
import "../styles/auth.css";

const Login = () => {
  const navigate = useNavigate();
  const submitting = useRef(false);
  const [fieldErrors, setFieldErrors] = useState({});

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

    if (submitting.current) return;
    setError("");
    const errors = validateLogin({ email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      
      event.currentTarget.querySelector('[name="' + Object.keys(errors)[0] + '"]')?.focus();
      return;
    }
    submitting.current = true;

    try {
      setLoading(true);

      // The API sets an HttpOnly session cookie and returns the verified user.
      const result = await login(
        normalizeEmail(email),
        password
      );

      // Check if ProtectedRoute supplied
      // a redirect destination.
      const redirect =
        searchParams.get("redirect");

      if (redirect && redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("\\")) {
        navigate(redirect);
        return;
      }

      // ROLE-BASED REDIRECT
      if (result.user.role === "teacher") {
        navigate("/teacher/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error) { if (error.response?.data?.code === "EMAIL_UNVERIFIED") { navigate("/verify-email", { state: { email } }); return; }
      setFieldErrors(error.response?.data?.errors || {});
      
      setError(
        error.response?.data?.message ||
          (!error.response ? "Cannot connect to the server. Please check your connection and try again." : "") ||
          "Unable to log in."
      );
    } finally {
      submitting.current = false;
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
            Keep learning. Keep teaching.
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
              Sign in to access your TuroLink
              account.
            </p>
          </div>

          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}

          <GoogleSignIn />
          <form noValidate
            onSubmit={handleSubmit}
            className="auth-form"
          >
            <label>
              Email Address

              <input
                type="email"
                placeholder="you@example.com"
                name="email" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined}
                autoComplete="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setFieldErrors((previous) => ({ ...previous, email: undefined })); setError(""); }}
              />
            <FieldError errors={fieldErrors} name="email" />
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
                  name="password" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setFieldErrors((previous) => ({ ...previous, password: undefined })); setError(""); }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            <FieldError errors={fieldErrors} name="password" />
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

          <div className="auth-footer-card signup-choice-card">
            <span>Don't have an account yet?</span>

            <div className="signup-choice-buttons">
              <Link
                to="/register"
                className="signup-choice-btn"
              >
                Sign Up as Student
              </Link>

              <Link
                to="/teacher/register"
                className="signup-choice-btn teacher"
              >
                Sign Up as Teacher
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
