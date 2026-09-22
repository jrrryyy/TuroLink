import {
  useEffect,
  useState,
} from "react";

import {
  BookOpen,
  Clock3,
  Star,
  Users,
} from "lucide-react";

import api from "../services/api";

import DashboardLayout
  from "../components/DashboardLayout";

import "../styles/teacher.css";

const TeacherDashboard = () => {
  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadDashboard =
      async () => {
        try {
          const response =
            await api.get(
              "/teacher/dashboard-data"
            );

          setData(
            response.data
          );
        } catch (error) {
          setErrorMessage("Unable to load the dashboard. Please refresh to try again.");
          console.error(
            "Teacher dashboard:",
            error
          );
        } finally {
          setLoading(false);
        }
      };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="teacher">
        <div className="dashboard-page-loading" role="status">Loading dashboard...</div>
      </DashboardLayout>
    );
  }

  const teacher =
    data?.teacher || {};

  const statistics =
    data?.statistics || {};

  const schedules =
    data?.schedules || [];

  const requests =
    data?.requests || [];

  const messages =
    data?.messages || [];

  return (
    <DashboardLayout
      role="teacher"
      userName={
        teacher.name ||
        "Teacher"
      }
      requestCount={
        requests.length
      }
      searchPlaceholder="Search Courses..."
    >
      <div className="teacher-main">
        {errorMessage && <p role="alert">{errorMessage}</p>}

        {/* WELCOME */}

        <section className="teacher-welcome">
          <div>
            <span>
              TEACHER DASHBOARD
            </span>

            <h1>
              Welcome Back,{" "}
              {teacher.name ||
                "Teacher"}!
            </h1>

            <p>
              Here's what's
              happening with your
              classes today.
            </p>
          </div>
        </section>


        {/* STATISTICS */}

        <section>
          <div className="teacher-section-heading">
            STATISTICS OVERVIEW
          </div>

          <div className="teacher-stat-grid">

            <div className="teacher-stat-card">
              <Users size={22} />

              <span>
                ACTIVE STUDENTS
              </span>

              <strong>
                {statistics
                  .activeStudents ||
                  0}{" "}
                Learners
              </strong>
            </div>


            <div className="teacher-stat-card">
              <Clock3 size={22} />

              <span>
                WEEKLY HOURS
                TAUGHT
              </span>

              <strong>
                {statistics
                  .weeklyHours ||
                  0}{" "}
                Hours
              </strong>
            </div>


            <div className="teacher-stat-card">
              <BookOpen
                size={22}
              />

              <span>
                ACTIVE SUBJECTS
              </span>

              <strong>
                {statistics
                  .activeSubjects ||
                  0}{" "}
                Courses
              </strong>
            </div>


            <div className="teacher-stat-card">
              <Star size={22} />

              <span>
                AVERAGE RATING
              </span>

              <strong>
                {statistics
                  .totalRatings >
                0
                  ? `${statistics.averageRating}/5`
                  : "No ratings yet"}
              </strong>
            </div>

          </div>
        </section>


        <div className="teacher-content-grid">

          {/* SCHEDULE */}

          <section className="teacher-dashboard-card">

            <div className="teacher-card-title">
              UPCOMING TEACHING
              SCHEDULE
            </div>

            {schedules.length ===
            0 ? (
              <div className="teacher-empty-state">
                No classes
                scheduled yet.
              </div>
            ) : (
              schedules.map(
                (
                  schedule,
                  index
                ) => (
                  <div
                    className="teacher-class-card"
                    key={index}
                  >
                    <div>
                      <span>
                        SUBJECT
                      </span>

                      <h3>
                        {
                          schedule.subject
                        }
                      </h3>

                      <p>
                        {
                          schedule.time
                        }
                      </p>
                    </div>

                    <div className="teacher-class-actions">

                      <button className="teacher-view-button">
                        View Students
                      </button>

                      <button className="teacher-start-button">
                        Start Class
                      </button>

                    </div>
                  </div>
                )
              )
            )}

          </section>


          {/* RIGHT */}

          <div className="teacher-right-column">

            <section className="teacher-dashboard-card">

              <div className="teacher-card-title">
                PENDING REQUESTS &
                MESSAGES
              </div>

              {requests.length ===
              0 ? (
                <div className="teacher-empty-state">
                  No pending
                  requests.
                </div>
              ) : (
                requests.map(
                  (
                    request,
                    index
                  ) => (
                    <div
                      className="teacher-request"
                      key={index}
                    >
                      <strong>
                        One on One
                        Session Request
                      </strong>

                      <p>
                        From:{" "}
                        {
                          request.studentName
                        }
                      </p>

                      <p>
                        Subject:{" "}
                        {
                          request.subject
                        }
                      </p>

                      <p>
                        Time:{" "}
                        {
                          request.time
                        }
                      </p>

                      <div className="teacher-request-actions">

                        <a className="teacher-accept-button" href="/teacher/requests">Review Request</a>

                      </div>
                    </div>
                  )
                )
              )}

            </section>


            <section className="teacher-dashboard-card">

              <div className="teacher-card-title">
                UNREAD MESSAGES
              </div>

              {messages.filter(
                (message) =>
                  message.unread
              ).length === 0 ? (
                <div className="teacher-empty-state">
                  No unread
                  messages.
                </div>
              ) : (
                messages
                  .filter(
                    (message) =>
                      message.unread
                  )
                  .map(
                    (
                      message,
                      index
                    ) => (
                      <div
                        className="teacher-message"
                        key={
                          index
                        }
                      >
                        <strong>
                          {
                            message.studentName
                          }
                        </strong>

                        <p>
                          {
                            message.message
                          }
                        </p>

                        <button>
                          Reply in
                          Chat
                        </button>
                      </div>
                    )
                  )
              )}

            </section>

          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
