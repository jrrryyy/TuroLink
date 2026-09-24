import PasswordStrength from '../components/PasswordStrength';
import GoogleSignIn from '../components/GoogleSignIn';
import { validateRegistration, documentError } from "../../../shared/validation.mjs";
import FieldError from "../components/FieldError";
import "../styles/validation.css";
import { useRef, useState } from "react";
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
  const submitting = useRef(false);
  const [fieldErrors, setFieldErrors] = useState({});
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
    setFieldErrors((previous) => ({ ...previous, [name]: undefined }));
    setError("");

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleNext = (event) => {
    event.preventDefault();
    setError("");

    const errors = validateRegistration(formData, { accountOnly: true });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      event.currentTarget.querySelector('[name="' + Object.keys(errors)[0] + '"]')?.focus();
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting.current) return;
    setError("");
    const errors = validateRegistration({ ...formData, terms, verificationConsent }, { teacher: true, file: document });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      if (["name", "email", "phone", "password", "confirmPassword"].some((key) => errors[key])) setStep(1);
      event.currentTarget.querySelector('[name="' + Object.keys(errors)[0] + '"]')?.focus();
      return;
    }
    submitting.current = true;

    try {
      setLoading(true);

      const data = new FormData();

      data.append("name", formData.name);
      data.append("email", formData.email);
      data.append("phone", formData.phone);
      data.append("password", formData.password);
      data.append("confirmPassword", formData.confirmPassword);
      data.append("terms", String(terms));
      data.append("verificationConsent", String(verificationConsent));

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

      const result = await registerTeacher(data);
      navigate("/verify-email", { state: { email: formData.email, message: result.message } });
    } catch (err) {
      setFieldErrors(err.response?.data?.errors || {});
      if (["name", "email", "phone", "password", "confirmPassword"].some((key) => err.response?.data?.errors?.[key])) setStep(1);
      setError(
        err.response?.data?.message ||
          (!err.response ? "Cannot connect to the server. Please check your connection and try again." : "") ||
          "Unable to create teacher account."
      );
    } finally {
      submitting.current = false;
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
            <div role="alert" className="teacher-error">
              {error}
            </div>
          )}

          {/* STEP 1 */}

          {step === 1 && <GoogleSignIn />}
          {step === 1 && (
          <form noValidate
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
                  name="name" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "name-error" : undefined}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                />
              <FieldError errors={fieldErrors} name="name" />
            </label>

              <label>
                Email Address
                <input
                  type="email"
                  name="email" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              <FieldError errors={fieldErrors} name="email" />
            </label>

              <label>
                Phone Number
                <input
                  type="tel"
                  name="phone" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                />
              <FieldError errors={fieldErrors} name="phone" />
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
                    name="password" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    placeholder="At least 12 characters"
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
              <FieldError errors={fieldErrors} name="password" /><PasswordStrength value={formData.password} />
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
                    name="confirmPassword" aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
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
              <FieldError errors={fieldErrors} name="confirmPassword" />
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
            <form noValidate
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
                  name="degreeTitle" aria-invalid={Boolean(fieldErrors.degreeTitle)} aria-describedby={fieldErrors.degreeTitle ? "degreeTitle-error" : undefined}
                  placeholder="ex. Bachelor of Science in Information Technology"
                  value={
                    formData.degreeTitle
                  }
                  onChange={handleChange}
                />
              <FieldError errors={fieldErrors} name="degreeTitle" />
            </label>

              <label>
                Subject to Teach
                <input
                  type="text"
                  name="subjectToTeach" aria-invalid={Boolean(fieldErrors.subjectToTeach)} aria-describedby={fieldErrors.subjectToTeach ? "subjectToTeach-error" : undefined}
                  placeholder="Enter Subject"
                  value={
                    formData.subjectToTeach
                  }
                  onChange={handleChange}
                />
              <FieldError errors={fieldErrors} name="subjectToTeach" />
            </label>

              <label>
                Brief Teaching Bio

                <textarea
                  name="teachingBio" aria-invalid={Boolean(fieldErrors.teachingBio)} aria-describedby={fieldErrors.teachingBio ? "teachingBio-error" : undefined}
                  placeholder="Enter brief teaching bio"
                  value={
                    formData.teachingBio
                  }
                  onChange={handleChange}
                />
              <FieldError errors={fieldErrors} name="teachingBio" />
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
                    name="verificationDocument" aria-invalid={Boolean(fieldErrors.verificationDocument)} aria-describedby={fieldErrors.verificationDocument ? "verificationDocument-error" : undefined}
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => {
                      const file = event.target.files[0];
                      setDocument(file || null);
                      setFieldErrors((previous) => ({ ...previous, verificationDocument: documentError(file) }));
                    }}
                  />

                  <div className="teacher-upload-button">
                    Upload
                  </div>
                <FieldError errors={fieldErrors} name="verificationDocument" />
            </label>
              </div>

              <div className="teacher-terms">

                <label>
                  <input
                    type="checkbox"
                    name="terms" aria-invalid={Boolean(fieldErrors.terms)} aria-describedby={fieldErrors.terms ? "terms-error" : undefined}
                    checked={terms}
                    onChange={(event) => { setTerms(event.target.checked); setFieldErrors((previous) => ({ ...previous, terms: undefined })); }}
                  />

                  <span>
                    I agree to the TuroLink
                    Terms and Conditions.
                  </span>
                <FieldError errors={fieldErrors} name="terms" />
            </label>

                <label>
                  <input
                    type="checkbox"
                    name="verificationConsent" aria-invalid={Boolean(fieldErrors.verificationConsent)} aria-describedby={fieldErrors.verificationConsent ? "verificationConsent-error" : undefined}
                    checked={
                      verificationConsent
                    }
                    onChange={(event) => { setVerificationConsent(event.target.checked); setFieldErrors((previous) => ({ ...previous, verificationConsent: undefined })); }}
                  />

                  <span>
                    I confirm that the
                    information and documents
                    submitted are valid.
                  </span>
                <FieldError errors={fieldErrors} name="verificationConsent" />
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
