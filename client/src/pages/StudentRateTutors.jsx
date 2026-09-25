import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, User, CheckCircle2, Search, ArrowRight, Award } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import "../styles/student-rate-tutors.css";

// ── Avatar Component with Fallback ──────────────────────────────────────────
function TutorAvatar({ teacher }) {
  const [imgFailed, setImgFailed] = useState(false);
  const rawPic = teacher?.profilePicture;
  const avatarUrl = rawPic
    ? rawPic.startsWith("http")
      ? rawPic
      : `http://localhost:5000${rawPic.startsWith("/") ? "" : "/"}${rawPic}`
    : "";

  const initial = teacher?.name?.trim()?.charAt(0)?.toUpperCase() || "T";

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="rate-tutor-avatar-img"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return <span>{initial}</span>;
}

// ── Interactive Star Rating Picker ──────────────────────────────────────────
function InteractiveStars({
  value = 5,
  onChange,
  size = 24,
  readOnly = false,
}) {
  const [hoverVal, setHoverVal] = useState(0);

  return (
    <div
      className="rate-interactive-stars"
      onMouseLeave={() => !readOnly && setHoverVal(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverVal || value);
        return (
          <button
            key={star}
            type="button"
            className="rate-star-btn"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHoverVal(star)}
            onClick={() => !readOnly && onChange && onChange(star)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              size={size}
              className={`rate-star-icon ${isFilled ? "filled" : "empty"}`}
              style={{
                color: isFilled ? "#fbbf24" : "var(--layout-border)",
                fill: isFilled ? "#fbbf24" : "transparent",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

// ── Static Star Display Row ─────────────────────────────────────────────────
function StaticStars({ rating = 0, size = 16 }) {
  const num = Number(rating) || 0;
  return (
    <div className="rate-stars-row">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={`rate-star-icon ${star <= Math.round(num) ? "filled" : "empty"}`}
          style={{
            color: star <= Math.round(num) ? "#fbbf24" : "var(--layout-border)",
            fill: star <= Math.round(num) ? "#fbbf24" : "transparent",
          }}
        />
      ))}
      <span className="rate-star-num">{num ? num.toFixed(1) : "0.0"}</span>
    </div>
  );
}

export default function StudentRateTutors() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Rating Form State
  const [overallRating, setOverallRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [aspects, setAspects] = useState({
    teachingQuality: 5,
    communication: 5,
    punctuality: 5,
    professionalism: 5,
  });
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: "", text: "" });

  const loadData = async () => {
    try {
      const response = await api.get("/tutors/bookings");
      const list = (response.data || []).filter(
        (b) => !b.status || b.status === "confirmed"
      );

      setBookings(list);

      // Select first unrated session, or the first session in the list
      if (list.length > 0) {
        const initial = list.find((b) => !b.review?.rating) || list[0];
        setSelectedBooking(initial);
        resetFormWithBooking(initial);
      } else {
        setSelectedBooking(null);
      }
    } catch {
      setBookings([]);
      setSelectedBooking(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetFormWithBooking = (booking) => {
    if (!booking) return;
    if (booking.review?.rating) {
      setOverallRating(Number(booking.review.rating) || 5);
      setReviewText(booking.review.text || "");
      setAspects(
        booking.review.aspects || {
          teachingQuality: 5,
          communication: 5,
          punctuality: 5,
          professionalism: 5,
        }
      );
    } else {
      setOverallRating(5);
      setReviewText("");
      setAspects({
        teachingQuality: 5,
        communication: 5,
        punctuality: 5,
        professionalism: 5,
      });
    }
    setAlertMsg({ type: "", text: "" });
  };

  const handleSelectBooking = (booking) => {
    setSelectedBooking(booking);
    resetFormWithBooking(booking);
  };

  const handleAspectChange = (key, val) => {
    setAspects((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (submitting) return;

    setSubmitting(true);
    setAlertMsg({ type: "", text: "" });

    try {
      await api.post(`/tutors/bookings/${selectedBooking._id}/review`, {
        rating: Number(overallRating),
        text: reviewText.trim(),
        aspects,
      });

      const updatedReview = {
        rating: Number(overallRating),
        text: reviewText.trim(),
        aspects,
        createdAt: new Date(),
      };

      setBookings((prev) =>
        prev.map((b) =>
          b._id === selectedBooking._id ? { ...b, review: updatedReview } : b
        )
      );

      setSelectedBooking((prev) => ({ ...prev, review: updatedReview }));
      setAlertMsg({ type: "success", text: "Thank you! Your rating has been submitted." });
      
      // Refresh backend data in background
      loadData();
    } catch (err) {
      setAlertMsg({
        type: "error",
        text: err.response?.data?.message || "Unable to save your rating. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Metrics calculated strictly from real system bookings ─────────────────
  const ratedBookings = bookings.filter((b) => b.review?.rating);
  const tutorsRatedCount = new Set(
    ratedBookings.map((b) => String(b.teacher?._id || b.teacher))
  ).size;

  const avgRatingGiven = ratedBookings.length
    ? (
        ratedBookings.reduce((sum, b) => sum + Number(b.review.rating), 0) /
        ratedBookings.length
      ).toFixed(1)
    : null;

  // Real completed sessions count from user's booking history
  const completedSessionsCount = bookings.filter(
    (b) => new Date(b.end) <= new Date() || b.review?.rating
  ).length;

  const currentTeacher = selectedBooking?.teacher || {};
  const currentProfile = selectedBooking?.teacherProfile || {};
  const tutorFirstName = currentTeacher.name?.split(" ")[0] || "your tutor";
  const isAlreadyRated = Boolean(selectedBooking?.review?.rating);

  return (
    <DashboardLayout
      role="student"
      userName={user?.name || "Student"}
      searchPlaceholder="Search your tutors..."
    >
      <div className="rate-tutors-page">
        <div className="rate-tutors-layout">
          {/* ── Left Column: Header, Summary Stats, Tutors List ── */}
          <div className="rate-tutors-main-col">
            <header className="rate-tutors-header">
              <h1>Rate Your Tutors</h1>
              <p>Help us improve by rating your tutors. Your feedbacks makes a difference!</p>
            </header>

            {/* Top 3-Stat Summary Card: System Data */}
            <div className="rate-tutors-summary-card">
              <div className="rate-summary-item">
                <div className="rate-summary-value-wrap">
                  <Star className="rate-summary-icon" size={24} />
                  <span className="rate-summary-big">
                    {avgRatingGiven !== null ? `${avgRatingGiven}/5` : "0.0/5"}
                  </span>
                </div>
                <span className="rate-summary-label">Your Average Rating</span>
              </div>

              <div className="rate-summary-item">
                <div className="rate-summary-value-wrap">
                  <Star className="rate-summary-icon" size={24} />
                  <span className="rate-summary-big">{tutorsRatedCount}</span>
                </div>
                <span className="rate-summary-label">Tutors Rated</span>
              </div>

              <div className="rate-summary-item">
                <div className="rate-summary-value-wrap">
                  <User className="rate-summary-icon" size={24} />
                  <span className="rate-summary-big">{completedSessionsCount}</span>
                </div>
                <span className="rate-summary-label">Completed Sessions</span>
              </div>
            </div>

            {/* Section: Your Tutors */}
            <section className="rate-tutors-list-section">
              <div className="rate-section-title-wrap">
                <h2>Your Tutors</h2>
                <p>Rate the tutors you&apos;ve had sessions with.</p>
              </div>

              {loading ? (
                <div className="rate-tutors-empty">
                  <p>Loading your tutors…</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="rate-tutors-empty">
                  <Award size={36} />
                  <h3>No completed tutoring sessions yet</h3>
                  <p>
                    Once you complete a scheduled session with a tutor, they will appear here so you can share your feedback and ratings.
                  </p>
                  <Link to="/student/find-tutors" className="rate-tutor-btn">
                    <Search size={15} /> Find a tutor <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <div className="rate-tutors-card-list">
                  {bookings.map((b, idx) => {
                    const teacher = b.teacher || {};
                    const isSelected = selectedBooking?._id === b._id;
                    const rated = Boolean(b.review?.rating);
                    const avgRating = b.teacherProfile?.averageRating || 0;
                    const isYellowAvatar = idx % 2 === 0;

                    return (
                      <article
                        key={b._id}
                        className={`rate-tutor-item-card ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectBooking(b)}
                      >
                        <div className="rate-tutor-left-info">
                          <div
                            className={`rate-tutor-avatar-wrap ${
                              isYellowAvatar ? "yellow-avatar" : "green-avatar"
                            }`}
                          >
                            <TutorAvatar teacher={teacher} />
                          </div>
                          <div className="rate-tutor-meta">
                            <strong className="rate-tutor-name">{teacher.name || "Tutor"}</strong>
                            <span className="rate-tutor-subject">{b.subject}</span>
                          </div>
                        </div>

                        <div className="rate-tutor-right-actions">
                          <StaticStars rating={avgRating} size={17} />
                          {rated ? (
                            <button
                              type="button"
                              className="already-rated-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectBooking(b);
                              }}
                            >
                              Already Rated
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="rate-tutor-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectBooking(b);
                              }}
                            >
                              Rate Tutor
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ── Right Column: Sticky Rating & Review Form ── */}
          <div className="rate-tutors-panel-col">
            {selectedBooking ? (
              <form className="rate-form-card" onSubmit={handleSubmitRating}>
                {/* Tutor Header */}
                <div className="rate-form-tutor-header">
                  <div className="rate-form-avatar">
                    <TutorAvatar teacher={currentTeacher} />
                  </div>
                  <div className="rate-form-tutor-details">
                    <strong className="rate-form-tutor-name">
                      {currentTeacher.name || "Tutor"}
                    </strong>
                    <span className="rate-form-tutor-subject">
                      {selectedBooking.subject || "Tutoring"}
                    </span>
                    <div className="rate-stars-row">
                      <StaticStars
                        rating={currentProfile.averageRating || 0}
                        size={17}
                      />
                      <span className="rate-form-reviews-count">
                        ({currentProfile.totalRatings || 0} reviews)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mini Stats Pill Container: Real System Data */}
                <div className="rate-form-stats-pill">
                  <div className="rate-stat-metric">
                    <strong>{currentProfile.completedSessionsCount || 0}</strong>
                    <span>Sessions Completed</span>
                  </div>
                  <div className="rate-stat-divider" />
                  <div className="rate-stat-metric">
                    <strong>
                      {currentProfile.degreeTitle || currentProfile.subjectToTeach || "Tutor"}
                    </strong>
                    <span>Credentials</span>
                  </div>
                </div>

                {/* Rate Your Experience */}
                <div className="rate-form-section">
                  <h3 className="rate-form-section-title">Rate Your Experience</h3>
                  <p className="rate-form-subtext">
                    How would you rate your overall experience with {tutorFirstName}
                  </p>
                  <InteractiveStars
                    value={overallRating}
                    onChange={setOverallRating}
                    size={26}
                  />
                </div>

                {/* Add a Review (Optional) */}
                <div className="rate-form-section">
                  <h3 className="rate-form-section-title">
                    Add a Review <span style={{ fontWeight: 400, color: "var(--layout-muted)" }}>(Optional)</span>
                  </h3>
                  <div className="rate-textarea-wrap">
                    <textarea
                      className="rate-review-textarea"
                      placeholder="Share what you liked (or what would be improved)..."
                      maxLength={500}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                    />
                    <span className="rate-char-counter">{reviewText.length}/500</span>
                  </div>
                </div>

                {/* Rate Aspects */}
                <div className="rate-aspects-section">
                  <h3 className="rate-form-section-title">Rate Aspects</h3>

                  <div className="rate-aspect-row">
                    <span className="rate-aspect-label">Teaching Quality</span>
                    <InteractiveStars
                      value={aspects.teachingQuality || 5}
                      onChange={(val) => handleAspectChange("teachingQuality", val)}
                      size={20}
                    />
                  </div>

                  <div className="rate-aspect-row">
                    <span className="rate-aspect-label">Communication</span>
                    <InteractiveStars
                      value={aspects.communication || 5}
                      onChange={(val) => handleAspectChange("communication", val)}
                      size={20}
                    />
                  </div>

                  <div className="rate-aspect-row">
                    <span className="rate-aspect-label">Punctuality</span>
                    <InteractiveStars
                      value={aspects.punctuality || 5}
                      onChange={(val) => handleAspectChange("punctuality", val)}
                      size={20}
                    />
                  </div>

                  <div className="rate-aspect-row">
                    <span className="rate-aspect-label">Professionalism</span>
                    <InteractiveStars
                      value={aspects.professionalism || 5}
                      onChange={(val) => handleAspectChange("professionalism", val)}
                      size={20}
                    />
                  </div>
                </div>

                {/* Feedback Alerts */}
                {alertMsg.text && (
                  <p className={`rate-form-alert ${alertMsg.type}`}>{alertMsg.text}</p>
                )}

                {/* Submit Rating Button */}
                <button
                  type="submit"
                  className="rate-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    "Saving Rating…"
                  ) : isAlreadyRated ? (
                    <>
                      <CheckCircle2 size={18} /> Update Rating
                    </>
                  ) : (
                    "Submit Rating"
                  )}
                </button>
              </form>
            ) : (
              <div className="rate-form-card" style={{ textAlign: "center", color: "var(--layout-muted)" }}>
                <p>Select a tutor from the list to leave your rating and review.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
