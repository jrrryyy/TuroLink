import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BookOpen,
  Edit3,
  X,
} from "lucide-react";


import DashboardLayout from "../components/DashboardLayout";
import { useTheme } from "../context/ThemeContext";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

import "../styles/student-my-subjects.css";

const StudentMySubjects = () => {


  const { user } = useAuth();

  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const { darkMode } = useTheme();



  const [searchTerm, setSearchTerm] =
    useState("");

  const [editingSubject, setEditingSubject] =
    useState(null);

  const [error, setError] =
    useState("");

  const [formData, setFormData] =
    useState({
      title: "",
      instructorName: "",
      instructorAvatar: "",
      upcomingTopic: "",
      description: "",
    });


  // ==========================================
  // LOAD SUBJECTS
  // ==========================================

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/courses/my-courses"
      );

      setSubjects(response.data);
    } catch (error) {
      console.error(
        "Load subjects error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load your subjects."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchSubjects();
  }, []);


  // ==========================================
  // SEARCH
  // ==========================================

  const filteredSubjects = useMemo(() => {
    const search =
      searchTerm.trim().toLowerCase();

    if (!search) {
      return subjects;
    }

    return subjects.filter((subject) => {
      const title =
        subject.title?.toLowerCase() || "";

      const instructor =
        subject.instructorName?.toLowerCase() ||
        "";

      const topic =
        subject.upcomingTopic?.toLowerCase() ||
        "";

      return (
        title.includes(search) ||
        instructor.includes(search) ||
        topic.includes(search)
      );
    });
  }, [subjects, searchTerm]);


  // ==========================================
  // EDIT SUBJECT
  // ==========================================

  const openEditModal = (subject) => {
    setEditingSubject(subject);

    setFormData({
      title: subject.title || "",
      instructorName:
        subject.instructorName || "",
      instructorAvatar:
        subject.instructorAvatar || "",
      upcomingTopic:
        subject.upcomingTopic || "",
      description:
        subject.description || "",
    });

    setError("");
  };


  const closeEditModal = () => {
    setEditingSubject(null);

    setError("");

    setFormData({
      title: "",
      instructorName: "",
      instructorAvatar: "",
      upcomingTopic: "",
      description: "",
    });
  };


  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingSubject) {
      return;
    }

    try {
      setError("");

      await api.put(
        `/courses/${editingSubject._id}`,
        formData
      );

      closeEditModal();

      await fetchSubjects();
    } catch (error) {
      console.error(
        "Update subject error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to update the subject."
      );
    }
  };


  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <DashboardLayout role="student" userName={user?.name}>
        <div className="dashboard-page-loading" role="status">Loading subjects...</div>
      </DashboardLayout>
    );
  }


  // ==========================================
  // PAGE
  // ==========================================

  return (
    <DashboardLayout role="student" userName={user?.name} searchPlaceholder="Search Subjects..." searchValue={searchTerm} onSearchChange={setSearchTerm}>
      <div className={darkMode ? "student-subjects-page student-subjects-dark" : "student-subjects-page"}>
        <section className="student-subjects-main">

          {error && !editingSubject && (
            <div className="student-subjects-error">
              {error}
            </div>
          )}


          {filteredSubjects.length > 0 ? (
            <div className="student-subjects-grid">

              {filteredSubjects.map(
                (subject) => (
                  <article
                    className="student-subject-card"
                    key={subject._id}
                  >

                    {/* CARD HEADER */}

                    <div className="student-subject-card-header">

                      {subject.instructorAvatar ? (
                        <img
                          src={
                            subject.instructorAvatar
                          }
                          alt={
                            subject.instructorName
                          }
                          className="student-subject-tutor-avatar"
                        />
                      ) : (
                        <div className="student-subject-tutor-avatar fallback">
                          {subject.instructorName
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            "T"}
                        </div>
                      )}


                      <div className="student-subject-tutor-info">

                        <strong>
                          {
                            subject.instructorName
                          }
                        </strong>

                        <span>
                          {subject.title}
                        </span>

                      </div>


                      <button
                        type="button"
                        className="student-subject-edit"
                        onClick={() =>
                          openEditModal(
                            subject
                          )
                        }
                        aria-label="Edit subject"
                      >
                        <Edit3 size={16} />
                      </button>

                    </div>


                    {/* CARD BODY */}

                    <div className="student-subject-card-body">

                      <strong>
                        Upcoming topic:
                      </strong>

                      <span className="student-subject-topic">
                        {subject.upcomingTopic ||
                          "No upcoming topic"}
                      </span>


                      {subject.description && (
                        <p>
                          {
                            subject.description
                          }
                        </p>
                      )}

                    </div>

                  </article>
                )
              )}

            </div>
          ) : (
            <div className="student-subjects-empty">

              <BookOpen size={35} />

              <h2>
                {searchTerm
                  ? "No subjects found"
                  : "No subjects yet"}
              </h2>

              <p>
                {searchTerm
                  ? "Try searching for another subject or tutor."
                  : "Your enrolled subjects will appear here."}
              </p>

            </div>
          )}

        </section>


      {/* =====================================
          EDIT SUBJECT MODAL
      ====================================== */}

      {editingSubject && (
        <div
          className="student-subject-modal-overlay"
          onClick={closeEditModal}
        >

          <div
            className="student-subject-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="student-subject-modal-header">

              <div>
                <span>
                  UPDATE SUBJECT
                </span>

                <h2>
                  Edit Subject
                </h2>
              </div>


              <button
                type="button"
                onClick={closeEditModal}
                aria-label="Close"
              >
                <X size={20} />
              </button>

            </div>


            {error && (
              <div className="student-subject-form-error">
                {error}
              </div>
            )}


            <form
              className="student-subject-form"
              onSubmit={handleUpdate}
            >

              <label>
                Subject

                <input
                  type="text"
                  name="title"
                  value={
                    formData.title
                  }
                  onChange={
                    handleChange
                  }
                  required
                />
              </label>


              <label>
                Tutor Name

                <input
                  type="text"
                  name="instructorName"
                  value={
                    formData.instructorName
                  }
                  onChange={
                    handleChange
                  }
                  required
                />
              </label>


              <label>
                Tutor Avatar URL

                <input
                  type="text"
                  name="instructorAvatar"
                  value={
                    formData.instructorAvatar
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>


              <label>
                Upcoming Topic

                <input
                  type="text"
                  name="upcomingTopic"
                  value={
                    formData.upcomingTopic
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>


              <label>
                Notes / Description

                <textarea
                  name="description"
                  rows="4"
                  value={
                    formData.description
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>


              <div className="student-subject-modal-actions">

                <button
                  type="button"
                  className="student-subject-cancel"
                  onClick={
                    closeEditModal
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="student-subject-save"
                >
                  Save Changes
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      </div>
    </DashboardLayout>
  );
};

export default StudentMySubjects;