import { useState } from "react";

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

const Register = () => {
  const navigate = useNavigate();

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
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (
      !form.name ||
      !form.email ||
      !form.phone ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (form.password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!terms) {
      setError(
        "Please accept the Terms and Conditions."
      );
      return;
    }

    try {
      setLoading(true);

      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });

      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to create account."
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
            <div className="form-error">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >
            <label>
              Full Name

              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
              />
            </label>

            <label>
              Email Address

              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </label>

            <label>
              Phone Number

              <input
                type="tel"
                name="phone"
                placeholder="09XXXXXXXXX"
                value={form.phone}
                onChange={handleChange}
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
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={handleChange}
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

            <label>
              Confirm Password

              <div className="password-field">
                <input
                  type={
                    showConfirm
                      ? "text"
                      : "password"
                  }
                  name="confirmPassword"
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />

                <button
                  type="button"
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
            </label>

            <label className="terms-box">
              <input
                type="checkbox"
                checked={terms}
                onChange={(event) =>
                  setTerms(event.target.checked)
                }
              />

              <span>
                I agree to the Terms and Conditions
                and Privacy Policy.
              </span>
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

          <div className="auth-footer-card">
            Have an account?

            <Link to="/login">
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Register;