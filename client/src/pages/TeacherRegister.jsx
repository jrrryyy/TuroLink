import { useState } from "react";
import {
  Eye,
  EyeOff,
  Upload,
  FileText,
  Check,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import "../styles/teacher.css";

const TeacherRegister = () => {
  const navigate = useNavigate();
  const { registerTeacher } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    degreeTitle: "",
    subjectToTeach: "",
    teachingBio: "",
  });

  const [document, setDocument] = useState(null);

  const [terms, setTerms] = useState(false);
  const [verificationConsent, setVerificationConsent] =
    useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleNext = (event) => {
    event.preventDefault();
    setError("");

    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (
      !formData.degreeTitle ||
      !formData.subjectToTeach ||
      !formData.teachingBio
    ) {
      setError(
        "Please complete your expertise information."
      );
      return;
    }

    if (!terms || !verificationConsent) {
      setError(
        "Please accept the terms and verification agreement."
      );
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();

      data.append("name", formData.name);
      data.append("email", formData.email);
      data.append("phone", formData.phone);
      data.append("password", formData.password);

      data.append(
        "degreeTitle",
        formData.degreeTitle
      );

      data.append(
        "subjectToTeach",
        formData.subjectToTeach
      );

      data.append(
        "teachingBio",
        formData.teachingBio
      );

      if (document) {
        data.append(
          "verificationDocument",
          document
        );
      }

      const response = await registerTeacher
      (data); navigate("/teacher/dashboard"
      );

      localStorage.setItem(
        "turolinkToken",
        response.data.token
      );

      navigate("/teacher/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create teacher account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="teacher-register-page">

      {/* LEFT SIDE */}

      <section className="teacher-register-brand">
        <h1>TuroLink</h1>

        <p>
          Share your knowledge.
          <br />
          Inspire learners.
        </p>
      </section>

      {/* RIGHT SIDE */}

      <section className="teacher-register-panel">

        <div className="teacher-register-content">

          <div className="teacher-progress">

            <div
              className={
                step === 1
                  ? "teacher-step active"
                  : "teacher-step completed"
              }
            >
              <span>
                {step === 2 ? (
                  <Check size={15} />
                ) : (
                  "1"
                )}
              </span>

              PERSONAL & ACCOUNT INFO
            </div>

            <div
              className={
                step === 2
                  ? "teacher-step active"
                  : "teacher-step"
              }
            >
              <span>2</span>
              EXPERTISE & CREDENTIALS
            </div>

          </div>

          {error && (
            <div className="teacher-error">
              {error}
            </div>
          )}

          {/* STEP 1 */}

          {step === 1 && (
            <form
              className="teacher-form"
              onSubmit={handleNext}
            >
              <div className="teacher-title">
                <span>TEACHER SIGN UP</span>

                <h2>
                  Create Your
                  <br />
                  Teacher Account
                </h2>

                <p>
                  Start teaching and connecting
                  with students on TuroLink.
                </p>
              </div>

              <label>
                Name
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </label>

              <label>
                Phone Number
                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </label>

              <label>
                Password

                <div className="teacher-password">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    placeholder="Create password"
                    value={formData.password}
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

                <div className="teacher-password">
                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={
                      formData.confirmPassword
                    }
                    onChange={handleChange}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </label>

              <button
                className="teacher-primary-button"
                type="submit"
              >
                Next
              </button>
            </form>
          )}

          {/* STEP 2 */}

          {step === 2 && (
            <form
              className="teacher-form"
              onSubmit={handleSubmit}
            >
              <div className="teacher-title">
                <span>TEACHER SIGN UP</span>

                <h2>
                  Expertise &
                  <br />
                  Credentials
                </h2>

                <p>
                  Tell students about your
                  expertise and qualifications.
                </p>
              </div>

              <label>
                Degree Title
                <input
                  type="text"
                  name="degreeTitle"
                  placeholder="ex. Bachelor of Science in Information Technology"
                  value={
                    formData.degreeTitle
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Subject to Teach
                <input
                  type="text"
                  name="subjectToTeach"
                  placeholder="Enter Subject"
                  value={
                    formData.subjectToTeach
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Brief Teaching Bio

                <textarea
                  name="teachingBio"
                  placeholder="Enter brief teaching bio"
                  value={
                    formData.teachingBio
                  }
                  onChange={handleChange}
                />
              </label>

              <div className="verification-card">

                <div>
                  <strong>
                    Verification Documents
                  </strong>

                  <p>
                    File Upload: Upload Diploma /
                    PRC / ID
                  </p>
                </div>

                <label className="teacher-upload-box">

                  {document ? (
                    <>
                      <FileText size={36} />

                      <span>
                        {document.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload size={36} />

                      <span>
                        PDF, JPG or PNG
                      </span>
                    </>
                  )}

                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) =>
                      setDocument(
                        event.target.files[0]
                      )
                    }
                  />

                  <div className="teacher-upload-button">
                    Upload
                  </div>
                </label>
              </div>

              <div className="teacher-terms">

                <label>
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(event) =>
                      setTerms(
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    I agree to the TuroLink
                    Terms and Conditions.
                  </span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={
                      verificationConsent
                    }
                    onChange={(event) =>
                      setVerificationConsent(
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    I confirm that the
                    information and documents
                    submitted are valid.
                  </span>
                </label>

              </div>

              <div className="teacher-form-actions">

                <button
                  type="button"
                  className="teacher-back-button"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="teacher-primary-button"
                  disabled={loading}
                >
                  {loading
                    ? "Creating Account..."
                    : "Sign Up"}
                </button>

              </div>
            </form>
          )}

          <div className="teacher-signin-card">
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

export default TeacherRegister;