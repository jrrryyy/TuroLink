import PasswordStrength from '../components/PasswordStrength';
import GoogleSignIn from '../components/GoogleSignIn';
import { validateRegistration } from "../../../shared/validation.mjs";
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
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

const Register = () => {
  const navigate = useNavigate();
  const submitting = useRef(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const [terms, setTerms] = useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] =
    useState(false);

  const handleChange = (event) => {
    setFieldErrors((previous) => ({ ...previous, [event.target.name]: undefined }));
    setError("");
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting.current) return;
    setError("");
    const errors = validateRegistration({ ...form, terms });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      
      event.currentTarget.querySelector('[name="' + Object.keys(errors)[0] + '"]')?.focus();
      return;
    }
    submitting.current = true;

    try {
      setLoading(true);

      const result = await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
        terms,
      });

      navigate("/verify-email", { state: { email: form.email, message: result.message } });
    } catch (error) {
      setFieldErrors(error.response?.data?.errors || {});
      
      setError(
        error.response?.data?.message ||
          (!error.response ? "Cannot connect to the server. Please check your connection and try again." : "") ||
          "Unable to create account."
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
            Local learning.
            <br />
            Better connections.
          </p>
        </div>

        <div className="auth-decoration">
          <div className="auth-circle-one"></div>
          <div className="auth-circle-two"></div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container">
          <div className="progress-wrapper">
            <span>Student Registration</span>

            <div className="progress-bar">
              <div></div>
            </div>
          </div>

          <div className="auth-heading">
            <span className="section-label">
              JOIN TUROLINK
            </span>

            <h2>Sign Up</h2>

            <p>
              Create your student account to get
              started.
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
              Full Name

              <input
                type="text"
                name="name" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "name-error" : undefined}
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
              />
            <FieldError errors={fieldErrors} name="name" />
            </label>

            <label>
              Email Address

              <input
                type="email"
                name="email" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            <FieldError errors={fieldErrors} name="email" />
            </label>

            <label>
              Phone Number

              <input
                type="tel"
                name="phone" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                placeholder="09XXXXXXXXX"
                value={form.phone}
                onChange={handleChange}
              />
            <FieldError errors={fieldErrors} name="phone" />
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
                  name="password" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  placeholder="At least 12 characters"
                  value={form.password}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
            <FieldError errors={fieldErrors} name="password" /><PasswordStrength value={form.password} />
            </label>

            <label>
              Confirm Password

              <div className="password-field">
                <input
                  type={
                    showConfirm
                      ? "text"
                      : "password"
                  }
                  name="confirmPassword" aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  onClick={() =>
                    setShowConfirm(
                      !showConfirm
                    )
                  }
                >
                  {showConfirm ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            <FieldError errors={fieldErrors} name="confirmPassword" />
            </label>

            <label className="terms-box">
              <input
                type="checkbox"
                name="terms" aria-invalid={Boolean(fieldErrors.terms)} aria-describedby={fieldErrors.terms ? "terms-error" : undefined}
                checked={terms}
                onChange={(event) => {
                  setTerms(event.target.checked);
                  setFieldErrors((previous) => ({ ...previous, terms: undefined }));
                }}
              />

              <span>
                I agree to the Terms and Conditions
                and Privacy Policy.
              </span>
            <FieldError errors={fieldErrors} name="terms" />
            </label>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading
                ? "Creating Account..."
                : "Sign Up"}
            </button>
          </form>

          <div className="auth-footer-card signup-choice-card">

            <div className="signup-choice-buttons">
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

export default Register;
