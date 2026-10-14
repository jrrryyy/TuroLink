import TeacherAnnouncementInteraction from '../components/TeacherAnnouncementInteraction';
import { downloadFile } from '../services/download';
import { validateSubject, validateAnnouncement as announcementErrors } from "../../../shared/validation.mjs";
import FieldError from '../components/FieldError';
import ConfirmationModal from '../components/ConfirmationModal';
import "../styles/validation.css";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";


import { useTheme } from "../context/ThemeContext";
import TeacherClasswork from "../components/TeacherClasswork";
import TeacherEnrolledStudents from "../components/TeacherEnrolledStudents";
import StudentRecipientPicker from "../components/StudentRecipientPicker";
import DashboardLayout from "../components/DashboardLayout";
import { useSearchParams } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

import "../styles/teacher-my-subjects.css";


const TeacherMySubjects = () => {


  const { user } = useAuth();
  const [subjectErrors, setSubjectErrors] = useState({});
  const subjectSubmitting = useRef(false);
  const [subjectSaving, setSubjectSaving] = useState(false);
  const { darkMode } = useTheme();

  const fileInputRef =
    useRef(null);


  // =====================================================
  // MAIN STATE
  // =====================================================

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const searchTerm = searchParams.get("q") || "";
  const filteredSubjects = subjects.filter((subject) =>
    [subject.title, subject.description].some((value) => value?.toLowerCase().includes(searchTerm.trim().toLowerCase()))
  );

  const [
    selectedSubject,
    setSelectedSubject,
  ] = useState(null);

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "announcements"
  );


  // =====================================================
  // MODALS / UI
  // =====================================================

  const [
    showAddSubject,
    setShowAddSubject,
  ] = useState(false);

  const [
    showAnnouncementComposer,
    setShowAnnouncementComposer,
  ] = useState(false);

  const [
    showScheduleModal,
    setShowScheduleModal,
  ] = useState(false);

  const [
    showLinkInput,
    setShowLinkInput,
  ] = useState(false);


  // =====================================================
  // MESSAGES
  // =====================================================

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");


  // =====================================================
  // SUBJECT FORM
  // =====================================================

  const [
    subjectForm,
    setSubjectForm,
  ] = useState({
    title: "",
    description: "",
  });


  // =====================================================
  // ANNOUNCEMENT
  // =====================================================

  const [
    announcementContent,
    setAnnouncementContent,
  ] = useState("");

  const [
    announcementFile,
    setAnnouncementFile,
  ] = useState(null);

  const [
    announcementLink,
    setAnnouncementLink,
  ] = useState("");

  const [
    announcementRecipients,
    setAnnouncementRecipients,
  ] = useState([]);

  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);


  // =====================================================
  // SCHEDULE
  // =====================================================

  const [
    scheduleDate,
    setScheduleDate,
  ] = useState("");

  const [
    scheduleTime,
    setScheduleTime,
  ] = useState("");


  // =====================================================
  // LOAD SUBJECTS
  // =====================================================

  const loadSubjects =
    async () => {
      try {
        setLoading(true);

        setError("");

        const response =
          await api.get(
            "/subjects/my-subjects"
          );

        setSubjects(
          response.data
        );

        if (selectedSubject) {
          const updated =
            response.data.find(
              (subject) =>
                subject._id ===
                selectedSubject._id
            );

          if (updated) {
            setSelectedSubject(
              updated
            );
          }
        }
      } catch (error) {
        console.error(
          "Load teacher subjects:",
          error
        );

        setError(
          error.response?.data
            ?.message ||
            "Unable to load subjects."
        );
      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
    let active = true;
    api.get("/subjects/my-subjects")
      .then((response) => { if (active) setSubjects(response.data); })
      .catch((error) => { if (active) setError(error.response?.data?.message || "Unable to load subjects."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);


  // =====================================================
  // CLEAR ANNOUNCEMENT FORM
  // =====================================================

  const clearAnnouncementForm =
    () => {
      setEditingAnnouncement(null);
      setExistingAttachment(null);
      setRemoveAttachment(false);

      setAnnouncementContent(
        ""
      );

      setAnnouncementFile(
        null
      );

      setAnnouncementLink(
        ""
      );

      setAnnouncementRecipients(
        []
      );

      setShowLinkInput(
        false
      );

      setScheduleDate(
        ""
      );

      setScheduleTime(
        ""
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    };


  // =====================================================
  // CLOSE ANNOUNCEMENT COMPOSER
  // =====================================================

  const closeAnnouncementComposer =
    () => {
      setShowAnnouncementComposer(
        false
      );

      setShowScheduleModal(
        false
      );

      clearAnnouncementForm();

      setError("");
    };


  // =====================================================
  // SUBJECT FORM CHANGE
  // =====================================================

  const handleSubjectChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setSubjectForm(
      (previous) => ({
        ...previous,

        [name]: value,
      })
    );
  };


  // =====================================================
  // ADD SUBJECT
  // =====================================================

  const handleAddSubject =
    async (event) => {
      event.preventDefault();

      if (subjectSubmitting.current) return;
      const errors = validateSubject(subjectForm);
      setSubjectErrors(errors);
      if (Object.keys(errors).length) return;
      subjectSubmitting.current = true;
      setSubjectSaving(true);

      try {
        setError("");

        setSuccessMessage(
          ""
        );

        await api.post(
          "/subjects",
          {
                        title:
              subjectForm.title.trim(),

            description:
              subjectForm.description.trim(),
          }
        );

        setSubjectForm({
          title: "",
          description: "",
        });

        setShowAddSubject(
          false
        );

        setSuccessMessage(
          "Subject added successfully."
        );

        await loadSubjects();
      } catch (error) {
        setSubjectErrors(error.response?.data?.errors || {});
        console.error(
          "Add subject error:",
          error
        );

        setError(
          error.response?.data
            ?.message ||
            "Unable to add subject."
        );
      } finally { subjectSubmitting.current = false; setSubjectSaving(false); }
    };


  // =====================================================
  // OPEN SUBJECT
  // =====================================================

  const linkedSubject = searchParams.get('subject');
  const linkedPost = searchParams.get('post');
  useEffect(() => {
    if (!linkedSubject) return;
    let active = true;
    api.get('/subjects/' + linkedSubject).then(({ data }) => {
      if (active) { setSelectedSubject(data); setActiveTab('announcements'); setShowAnnouncementComposer(false); }
    }).catch(() => { if (active) setError('This subject is no longer available.'); });
    return () => { active = false; };
  }, [linkedSubject, linkedPost]);
  useEffect(() => {
    if (linkedPost && selectedSubject) document.getElementById('teacher-announcement-' + linkedPost)?.scrollIntoView({ block: 'center' });
  }, [linkedPost, selectedSubject, loading]);

  const openSubject =
    async (subject) => {
      try {
        setSearchParams(searchTerm ? { q: searchTerm } : {}, { replace: true });
        setError("");

        setSuccessMessage(
          ""
        );

        const response =
          await api.get(
            `/subjects/${subject._id}`
          );

        setSelectedSubject(
          response.data
        );

        setActiveTab(
          "announcements"
        );

        setShowAnnouncementComposer(
          false
        );

        clearAnnouncementForm();
      } catch (error) {
        console.error(
          "Open subject error:",
          error
        );

        setError(
          error.response?.data
            ?.message ||
            "Unable to open subject."
        );
      }
    };


  // =====================================================
  // OPEN NEW ANNOUNCEMENT
  // =====================================================

  const openNewAnnouncement =
    async (subject) => {
      try {
        setError("");

        setSuccessMessage(
          ""
        );

        const response =
          await api.get(
            `/subjects/${subject._id}`
          );

        setSelectedSubject(
          response.data
        );

        setActiveTab(
          "announcements"
        );

        clearAnnouncementForm();

        setShowAnnouncementComposer(
          true
        );
      } catch (error) {
        console.error(
          "Open announcement error:",
          error
        );

        setError(
          error.response?.data
            ?.message ||
            "Unable to open announcement."
        );
      }
    };


  // =====================================================
  // REFRESH SELECTED SUBJECT
  // =====================================================

  const refreshSelectedSubject =
    async () => {
      if (
        !selectedSubject?._id
      ) {
        return;
      }

      try {
        const response =
          await api.get(
            `/subjects/${selectedSubject._id}`
          );

        setSelectedSubject(
          response.data
        );
      } catch (error) {
        console.error(
          "Refresh subject error:",
          error
        );
      }
    };


  // =====================================================
  // DELETE SUBJECT
  // =====================================================

  const handleDeleteSubject = (subjectId) => {
    setSubjectToDelete(subjectId);
  };

  const executeDeleteSubject = async () => {
    const subjectId = subjectToDelete;
    if (!subjectId) return;
    setSubjectToDelete(null);
    try {
        setError("");

        await api.delete(
          `/subjects/${subjectId}`
        );

        setSelectedSubject(
          null
        );

        setShowAnnouncementComposer(
          false
        );

        clearAnnouncementForm();

        setSuccessMessage(
          "Subject deleted successfully."
        );

        await loadSubjects();
      } catch (error) {
        console.error(
          "Delete subject error:",
          error
        );

        setError(
          error.response?.data
            ?.message ||
            "Unable to delete subject."
        );
      }
    };


  // =====================================================
  // FILE SELECT
  // =====================================================

  const handleFileChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const maxFileSize =
      10 * 1024 * 1024;

    const allowedTypes = [
      "application/pdf",

      "application/msword",

      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      "application/vnd.ms-powerpoint",

      "application/vnd.openxmlformats-officedocument.presentationml.presentation",

      "application/vnd.ms-excel",

      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      "text/plain",

      "image/jpeg",

      "image/png",

      "image/webp",
    ];

    if (
      file.size >
      maxFileSize
    ) {
      setError(
        "File must be 10 MB or smaller."
      );

      event.target.value =
        "";

      return;
    }

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        "Unsupported file type. Please upload PDF, Word, PowerPoint, Excel, TXT, JPG, PNG, or WEBP."
      );

      event.target.value =
        "";

      return;
    }

    setError("");

    setAnnouncementFile(
      file
    );
  };


  // =====================================================
  // REMOVE FILE
  // =====================================================

  const removeAnnouncementFile =
    () => {
      setAnnouncementFile(
        null
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    };


  // =====================================================
  // VALIDATE ANNOUNCEMENT
  // =====================================================

  const validateAnnouncement = () => {
    const hasExistingFile = Boolean(existingAttachment && !removeAttachment);
    const errors = announcementErrors(
      { content: announcementContent, link: announcementLink },
      announcementFile || hasExistingFile
    );
    if (Object.keys(errors).length) { setError(Object.values(errors)[0]); return false; }
    return true;
  };


  // =====================================================
  // CREATE ANNOUNCEMENT FORM DATA
  // =====================================================

  const createAnnouncementFormData =
    (scheduledAt = null) => {
      const formData =
        new FormData();

      formData.append(
        "content",
        announcementContent.trim()
      );

      if (
        announcementFile
      ) {
        formData.append(
          "attachment",
          announcementFile
        );
      }

      if (removeAttachment) {
        formData.append("removeAttachment", "true");
      }

      if (
        announcementLink.trim()
      ) {
        formData.append(
          "link",
          announcementLink.trim()
        );
      }

      if (scheduledAt) {
        formData.append(
          "scheduledAt",
          scheduledAt
        );
      }

      formData.append(
        "recipientStudents",
        JSON.stringify(announcementRecipients || [])
      );

      return formData;
    };


  // =====================================================
  // POST ANNOUNCEMENT
  // =====================================================

  const postAnnouncement =
    async () => {
      if (
        !selectedSubject?._id
      ) {
        setError(
          "No subject selected."
        );

        return;
      }

      if (
        !validateAnnouncement()
      ) {
        return;
      }

      try {
        setError("");

        setSuccessMessage(
          ""
        );

        const formData =
          createAnnouncementFormData();

        const isEditing = Boolean(editingAnnouncement);
        const url = isEditing
          ? `/subjects/${selectedSubject._id}/announcements/${editingAnnouncement._id}`
          : `/subjects/${selectedSubject._id}/announcements`;
        const method = isEditing ? api.put : api.post;

        const response = await method(url, formData);

        clearAnnouncementForm();

        setShowAnnouncementComposer(
          false
        );

        setSuccessMessage(
          response.data?.message ||
            (isEditing ? "Announcement updated successfully." : "Announcement posted successfully.")
        );

        await refreshSelectedSubject();

        const subjectsResponse =
          await api.get(
            "/subjects/my-subjects"
          );

        setSubjects(
          subjectsResponse.data
        );
      } catch (error) {
        console.error(
          "Post announcement error:",
          error
        );

        setError(
          error.response?.data
            ?.message ||
            "Unable to post announcement."
        );
      }
    };


  // =====================================================
  // EDIT ANNOUNCEMENT
  // =====================================================

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementContent(announcement.content || "");
    setAnnouncementLink(announcement.link || "");
    setAnnouncementFile(null);
    setRemoveAttachment(false);
    setExistingAttachment(
      announcement.attachment
        ? {
            url: announcement.attachment,
            name: announcement.attachmentName || "Attachment",
            type: announcement.attachmentType || "",
          }
        : null
    );
    setAnnouncementRecipients(announcement.recipientStudents || []);
    setShowLinkInput(Boolean(announcement.link));
    setShowAnnouncementComposer(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  // =====================================================
  // DELETE ANNOUNCEMENT
  // =====================================================

  const handleDeleteAnnouncement = (announcementId) => {
    setAnnouncementToDelete(announcementId);
  };

  const executeDeleteAnnouncement = async () => {
    const announcementId = announcementToDelete;
    if (!announcementId || !selectedSubject?._id) return;
    setAnnouncementToDelete(null);

    try {
      setError("");

      await api.delete(
        `/subjects/${selectedSubject._id}/announcements/${announcementId}`
      );

      setSuccessMessage(
        "Announcement deleted successfully."
      );

      await refreshSelectedSubject();
    } catch (error) {
      console.error(
        "Delete announcement error:",
        error
      );

      setError(
        error.response?.data
          ?.message ||
          "Unable to delete announcement."
      );
    }
  };


  // =====================================================
  // SCHEDULE ANNOUNCEMENT
  // =====================================================

  const scheduleAnnouncement =
    async () => {
      if (
        !selectedSubject?._id
      ) {
        setError(
          "No subject selected."
        );

        return;
      }

      if (
        !validateAnnouncement()
      ) {
        return;
      }

      if (
        !scheduleDate ||
        !scheduleTime
      ) {
        setError(
          "Please select a date and time."
        );

        return;
      }

      const scheduledAt =
        new Date(
          `${scheduleDate}T${scheduleTime}`
        );

      if (
        Number.isNaN(
          scheduledAt.getTime()
        )
      ) {
        setError(
          "Invalid schedule date or time."
        );

        return;
      }

      if (
        scheduledAt <=
        new Date()
      ) {
        setError(
          "Schedule must be in the future."
        );

        return;
      }

      try {
        setError("");

        setSuccessMessage(
          ""
        );

        const formData =
          createAnnouncementFormData(
            scheduledAt.toISOString()
          );

        const response =
          await api.post(
            `/subjects/${selectedSubject._id}/announcements`,
            formData
          );

        clearAnnouncementForm();

        setShowScheduleModal(
          false
        );

        setShowAnnouncementComposer(
          false
        );

        setSuccessMessage(
          response.data?.message ||
            "Announcement scheduled successfully."
        );

        await refreshSelectedSubject();

        const subjectsResponse =
          await api.get(
            "/subjects/my-subjects"
          );

        setSubjects(
          subjectsResponse.data
        );
      } catch (error) {
        console.error(
          "Schedule announcement error:",
          error
        );

        setError(
          error.response?.data
            ?.message ||
            "Unable to schedule announcement."
        );
      }
    };


  // =====================================================
  // ANNOUNCEMENT DATE
  // =====================================================

  const formatAnnouncementTime =
    (announcement) => {
      if (
        announcement.status ===
          "scheduled" &&
        announcement.scheduledAt
      ) {
        return `Scheduled ${new Date(
          announcement.scheduledAt
        ).toLocaleString()}`;
      }

      const date =
        announcement.postedAt ||
        announcement.createdAt;

      if (!date) {
        return "";
      }

      return new Date(
        date
      ).toLocaleString();
    };


  // =====================================================
  // FILE SIZE
  // =====================================================

  const formatFileSize = (
    bytes
  ) => {
    if (!bytes) {
      return "";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(2)} MB`;
  };


  // =====================================================
  // ATTACHMENT URL
  // =====================================================

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <DashboardLayout role="teacher" userName={user?.name}>
        <div className="dashboard-page-loading" role="status">Loading subjects...</div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout role="teacher" userName={user?.name} searchPlaceholder="Search Subjects..." searchValue={searchTerm} onSearchChange={(value) => { setSearchParams(value ? { q: value } : {}, { replace: true }); setSelectedSubject(null); }}>
      <div className={darkMode ? "teacher-subject-page teacher-subject-dark" : "teacher-subject-page"}>
        <section className="teacher-subject-content">

        {error && (
          <div className="teacher-subject-error">
            {error}
          </div>
        )}


        {/* =================================================
            SUBJECT LIST
        ================================================= */}

        {!selectedSubject ? (
          <>

            <div className="teacher-subject-title-row">

              <div><span className="teacher-eyebrow">YOUR CLASSROOM</span><h1>My Subjects</h1><p className="teacher-page-description">A home for every lesson. Share updates, prepare classwork, and support your students.</p></div>

              <button
                type="button"
                className="teacher-subject-primary"
                onClick={() => {
                  setError("");

                  setSuccessMessage(
                    ""
                  );

                  setShowAddSubject(
                    true
                  );
                }}
              >
                <Plus
                  size={15}
                />

                Add Subject
              </button>

            </div>


            {successMessage && (
              <div className="teacher-subject-success">
                <CheckCircle2 size={17} />
                {successMessage}
              </div>
            )}

            <div className="teacher-subject-toolbar-row">
              <div className="teacher-subject-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search subjects by title or description..."
                  value={searchTerm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchParams(val ? { q: val } : {}, { replace: true });
                  }}
                  aria-label="Search subjects"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="teacher-subject-search-clear"
                    onClick={() => setSearchParams({}, { replace: true })}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {searchTerm && (
                <div className="teacher-subject-filter-status">
                  <span>
                    {filteredSubjects.length === 1
                      ? `1 subject matching "${searchTerm}"`
                      : `${filteredSubjects.length} subjects matching "${searchTerm}"`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchParams({}, { replace: true })}
                  >
                    Clear filter
                  </button>
                </div>
              )}
            </div>

            <div className="teacher-subject-list">

              {filteredSubjects.length ===
              0 ? (
                <div className="teacher-subject-empty">

                  <BookOpen
                    size={34}
                  />

                  <h2>
                    {searchTerm ? "No matching subjects" : "No subjects yet"}
                  </h2>

                  <p>
                    Add your first
                    subject to get
                    started.
                  </p>

                </div>
              ) : (
                filteredSubjects.map(
                  (subject) => (
                    <div
                      key={
                        subject._id
                      }
                      className="teacher-subject-row"
                      onClick={() =>
                        openSubject(
                          subject
                        )
                      }
                    >

                      <div>

                        <h2>
                          <button type="button" className="teacher-subject-open" onClick={(event) => { event.stopPropagation(); openSubject(subject); }}>
                          {subject.title}
                          </button>
                        </h2>

                        <p>
                          Enrolled
                          Students:{" "}
                          {subject
                            .enrolledStudents
                            ?.length ||
                            0}

                          {" | "}

                          Subject
                          Rating:{" "}
                          {subject.rating ||
                            0}
                          /5
                        </p>

                      </div>


                      <button
                        type="button"
                        onClick={(
                          event
                        ) => {
                          event.stopPropagation();

                          openNewAnnouncement(
                            subject
                          );
                        }}
                      >
                        <Plus
                          size={14}
                        />

                        New Announcement
                      </button>

                    </div>
                  )
                )
              )}

            </div>

          </>
        ) : (
          <>

            {/* =============================================
                SUBJECT DETAIL
            ============================================= */}

            <div className="teacher-subject-detail-heading">

              <div className="teacher-subject-detail-info">

                <button
                  type="button"
                  className="teacher-subject-back"
                  onClick={() => {
                    setSearchParams(searchTerm ? { q: searchTerm } : {}, { replace: true });
                    setSelectedSubject(
                      null
                    );

                    setSuccessMessage(
                      ""
                    );

                    setError("");

                    closeAnnouncementComposer();
                  }}
                >
                  ← Subjects
                </button>


                <h1>
                  {selectedSubject.title}
                </h1>


                <p>
                  Enrolled Students:{" "}
                  {selectedSubject
                    .enrolledStudents
                    ?.length ||
                    0}

                  {" | "}

                  Subject Rating:{" "}
                  {selectedSubject.rating ||
                    0}
                  /5
                </p>

              </div>


              <div className="teacher-subject-detail-actions">

                <button
                  type="button"
                  className="teacher-subject-primary"
                  onClick={() => {
                    setError("");

                    setSuccessMessage(
                      ""
                    );

                    setActiveTab(
                      "announcements"
                    );

                    clearAnnouncementForm();

                    setShowAnnouncementComposer(
                      true
                    );
                  }}
                >
                  <Plus
                    size={15}
                  />

                  New Announcement
                </button>


                <button
                  type="button"
                  className="teacher-subject-delete-button"
                  onClick={() =>
                    handleDeleteSubject(
                      selectedSubject._id
                    )
                  }
                >
                  <Trash2
                    size={15}
                  />

                  Delete Subject
                </button>

              </div>

            </div>


            {successMessage && (
              <div className="teacher-subject-success">

                <CheckCircle2
                  size={17}
                />

                {successMessage}

              </div>
            )}


            {/* =============================================
                TABS
            ============================================= */}

            <div className="teacher-subject-tabs">

              <button
                type="button"
                className={
                  activeTab ===
                  "announcements"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(
                    "announcements"
                  )
                }
              >
                Announcements
              </button>


              <button
                type="button"
                className={
                  activeTab ===
                  "materials"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(
                    "materials"
                  )
                }
              >
                Materials
              </button>

              <button
                type="button"
                className={
                  activeTab ===
                  "students"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(
                    "students"
                  )
                }
              >
                Students ({selectedSubject.enrolledStudents?.length || 0})
              </button>

            </div>


            {/* =============================================
                NEW ANNOUNCEMENT COMPOSER
            ============================================= */}

            {showAnnouncementComposer &&
              activeTab ===
                "announcements" && (
                <section className="teacher-announcement-composer">

                  <div className="teacher-announcement-composer-heading">

                    <h2>
                      {editingAnnouncement ? "Edit Announcement" : "New Announcement"}
                    </h2>

                    <button
                      type="button"
                      onClick={
                        closeAnnouncementComposer
                      }
                      aria-label="Close announcement"
                    >
                      <X
                        size={18}
                      />
                    </button>

                  </div>


                  <div className="teacher-announcement-audience">

                    <span>
                      To:{" "}
                      {selectedSubject.title}
                    </span>

                    <StudentRecipientPicker
                      enrolledStudents={selectedSubject.enrolledStudents || []}
                      value={announcementRecipients}
                      onChange={setAnnouncementRecipients}
                      compact={true}
                      ariaLabel="Announcement audience"
                    />

                  </div>


                  <textarea
                    placeholder="Type an announcement..."
                    value={
                      announcementContent
                    }
                    onChange={(
                      event
                    ) =>
                      setAnnouncementContent(
                        event.target
                          .value
                      )
                    }
                  />


                  {/* =====================================
                      EXISTING ATTACHMENT PREVIEW (EDITING)
                  ===================================== */}

                  {existingAttachment && !removeAttachment && !announcementFile && (
                    <div className="teacher-announcement-attachment-preview">
                      <div className="teacher-announcement-attachment-info">
                        <FileText size={18} />
                        <div>
                          <strong>{existingAttachment.name}</strong>
                          <span>Current attachment</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRemoveAttachment(true)}
                        aria-label="Remove attachment"
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* =====================================
                      SELECTED FILE PREVIEW
                  ===================================== */}

                  {announcementFile && (
                    <div className="teacher-announcement-attachment-preview">

                      <div className="teacher-announcement-attachment-info">

                        <FileText
                          size={18}
                        />

                        <div>

                          <strong>
                            {
                              announcementFile.name
                            }
                          </strong>

                          <span>
                            {formatFileSize(
                              announcementFile.size
                            )}
                          </span>

                        </div>

                      </div>


                      <button
                        type="button"
                        onClick={
                          removeAnnouncementFile
                        }
                        aria-label="Remove attachment"
                        title="Remove file"
                      >
                        <X
                          size={16}
                        />
                      </button>

                    </div>
                  )}


                  {/* =====================================
                      LINK INPUT
                  ===================================== */}

                  {showLinkInput && (
                    <div className="teacher-announcement-link-input">

                      <LinkIcon
                        size={17}
                      />

                      <input
                        type="url"
                        placeholder="Paste a link here..."
                        value={
                          announcementLink
                        }
                        onChange={(
                          event
                        ) =>
                          setAnnouncementLink(
                            event.target
                              .value
                          )
                        }
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setAnnouncementLink(
                            ""
                          );

                          setShowLinkInput(
                            false
                          );
                        }}
                        aria-label="Remove link"
                        title="Remove link"
                      >
                        <X
                          size={16}
                        />
                      </button>

                    </div>
                  )}


                  {/* =====================================
                      ACTIONS
                  ===================================== */}

                  <div className="teacher-announcement-actions">

                    <div className="teacher-announcement-tools">

                      {/* Hidden File Input */}

                      <input
                        ref={
                          fileInputRef
                        }
                        type="file"
                        hidden
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp"
                        onChange={
                          handleFileChange
                        }
                      />


                      {/* Attach File */}

                      <button
                        type="button"
                        title="Attach file"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                      >
                        <Paperclip
                          size={17}
                        />
                      </button>


                      {/* Add Link */}

                      <button
                        type="button"
                        title="Add link"
                        onClick={() =>
                          setShowLinkInput(
                            (previous) =>
                              !previous
                          )
                        }
                      >
                        <LinkIcon
                          size={17}
                        />
                      </button>

                    </div>


                    <div className="teacher-announcement-submit">

                      <button
                        type="button"
                        className="cancel"
                        onClick={
                          closeAnnouncementComposer
                        }
                      >
                        Cancel
                      </button>


                      <button
                        type="button"
                        className="post"
                        onClick={
                          postAnnouncement
                        }
                      >
                        {editingAnnouncement ? "Save Changes" : "Post"}
                      </button>


                      {!editingAnnouncement && (
                        <button
                          type="button"
                          className="dropdown"
                          title="Schedule announcement"
                          onClick={() => {
                            if (
                              !validateAnnouncement()
                            ) {
                              return;
                            }

                            setError("");

                            setShowScheduleModal(
                              true
                            );
                          }}
                        >
                          <ChevronDown
                            size={18}
                          />
                        </button>
                      )}

                    </div>

                  </div>

                </section>
              )}


            {/* =============================================
                ANNOUNCEMENT LIST
            ============================================= */}

            {activeTab ===
              "announcements" && (
              <div className="teacher-announcement-list">

                {!selectedSubject
                  .announcements ||
                selectedSubject
                  .announcements
                  .length === 0 ? (
                  <div className="teacher-subject-empty">

                    <MessageCircle
                      size={32}
                    />

                    <h2>
                      No announcements
                    </h2>

                    <p>
                      Create your first
                      announcement for
                      this subject.
                    </p>

                  </div>
                ) : (
                  [
                    ...selectedSubject
                      .announcements,
                  ]
                    .reverse()
                    .map(
                      (
                        announcement
                      ) => (
                        <article
                          key={
                            announcement._id
                          }
                          className="teacher-announcement-card" id={`teacher-announcement-${announcement._id}`}
                        >

                          <div className="teacher-announcement-author">

                            <div className="teacher-announcement-avatar">

                              {user?.name
                                ?.charAt(
                                  0
                                )
                                ?.toUpperCase() ||
                                "T"}

                            </div>


                            <div>

                              <strong>
                                Prof.{" "}
                                {user?.name ||
                                  "Teacher"}
                              </strong>

                              <span>
                                Lead Instructor
                              </span>

                            </div>


                            <div className="teacher-announcement-top-actions">

                              {announcement.recipientStudents && announcement.recipientStudents.length > 0 ? (
                                <span className="recipient-badge specific" title="Sent to specific students">
                                  <Users size={12} />
                                  {announcement.recipientStudents.length === 1
                                    ? (announcement.recipientStudents[0]?.name || "1 Student")
                                    : `${announcement.recipientStudents.length} Students`}
                                </span>
                              ) : (
                                <span className="recipient-badge" title="Sent to all enrolled students">
                                  <Users size={12} />
                                  All Students
                                </span>
                              )}

                              <small>
                                {formatAnnouncementTime(
                                  announcement
                                )}
                              </small>


                              <details className="teacher-announcement-menu">
                                <summary aria-label="Announcement actions" title="More options">
                                  <MoreVertical size={18} />
                                </summary>
                                <div>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.currentTarget.closest('details').open = false;
                                      handleEditAnnouncement(announcement);
                                    }}
                                  >
                                    <Pencil size={14} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="danger"
                                    onClick={(event) => {
                                      event.currentTarget.closest('details').open = false;
                                      handleDeleteAnnouncement(
                                        announcement._id
                                      );
                                    }}
                                  >
                                    <Trash2 size={14} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </details>

                            </div>

                          </div>


                          {/* ANNOUNCEMENT TEXT */}

                          {announcement.content && (
                            <p>
                              {
                                announcement.content
                              }
                            </p>
                          )}


                          {/* =================================
                              FILE ATTACHMENT
                          ================================= */}

                          {announcement.attachment && (
                            <a
                              className="teacher-posted-attachment"
                              href="#" onClick={async (event) => { event.preventDefault(); try { await downloadFile(`/subjects/${selectedSubject._id}/announcements/${announcement._id}/attachment`, announcement.attachmentName); } catch (error) { setError(error.message); } }}
                              target="_blank"
                              rel="noopener noreferrer"
                            >

                              <FileText
                                size={20}
                              />

                              <div>

                                <strong>
                                  {announcement
                                    .attachmentName ||
                                    "Attached File"}
                                </strong>

                                <span>
                                  Open attachment
                                </span>

                              </div>


                              <ExternalLink
                                size={15}
                              />

                            </a>
                          )}


                          {/* =================================
                              LINK ATTACHMENT
                          ================================= */}

                          {announcement.link && (
                            <a
                              className="teacher-posted-link"
                              href={
                                announcement.link
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >

                              <LinkIcon
                                size={19}
                              />

                              <div>

                                <strong>
                                  Attached Link
                                </strong>

                                <span>
                                  {
                                    announcement.link
                                  }
                                </span>

                              </div>


                              <ExternalLink
                                size={15}
                              />

                            </a>
                          )}


                          {(announcement.status === 'posted' || (announcement.scheduledAt && new Date(announcement.scheduledAt) <= new Date())) ? <TeacherAnnouncementInteraction subjectId={selectedSubject._id} announcementId={announcement._id} /> : <p>Likes and comments are available after publication.</p>}

                        </article>
                      )
                    )
                )}

              </div>
            )}


            {/* =============================================
                MATERIALS
            ============================================= */}

            {activeTab === "materials" && (
              <TeacherClasswork key={selectedSubject._id} subject={selectedSubject} teacherName={user?.name} />
            )}

            {/* =============================================
                STUDENTS
            ============================================= */}

            {activeTab === "students" && (
              <TeacherEnrolledStudents
                key={selectedSubject._id}
                subject={selectedSubject}
                onStudentRemoved={loadSubjects}
              />
            )}
          </>
        )}

      </section>


      {/* =================================================
          ADD SUBJECT MODAL
      ================================================= */}

      {showAddSubject && (
        <div
          className="teacher-subject-modal-overlay"
          onClick={() =>
            setShowAddSubject(
              false
            )
          }
        >

          <form noValidate
            className="teacher-subject-modal"
            onSubmit={
              handleAddSubject
            }
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="teacher-subject-modal-heading">

              <div>

                <span>
                  NEW SUBJECT
                </span>

                <h2>
                  Add Subject
                </h2>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowAddSubject(
                    false
                  )
                }
                aria-label="Close"
              >
                <X
                  size={19}
                />
              </button>

            </div>


            <label>

              Subject Name

              <input
                type="text"
                name="title" aria-invalid={Boolean(subjectErrors.title)} aria-describedby={subjectErrors.title ? "title-error" : undefined}
                placeholder="Advanced Database"
                value={
                  subjectForm.title
                }
                onChange={
                  handleSubjectChange
                }
                required
              />

            <FieldError errors={subjectErrors} name="title" /></label>


            <label>

              Description

              <textarea
                name="description" aria-invalid={Boolean(subjectErrors.description)} aria-describedby={subjectErrors.description ? "description-error" : undefined}
                rows="4"
                placeholder="Subject description..."
                value={
                  subjectForm.description
                }
                onChange={
                  handleSubjectChange
                }
              />

            <FieldError errors={subjectErrors} name="description" /></label>


            <div className="teacher-subject-modal-buttons">

              <button
                type="button"
                className="cancel"
                onClick={() =>
                  setShowAddSubject(
                    false
                  )
                }
              >
                Cancel
              </button>


              <button
                type="submit" disabled={subjectSaving}
                className="save"
              >
                Add Subject
              </button>

            </div>

          </form>

        </div>
      )}


      {/* =================================================
          SCHEDULE ANNOUNCEMENT MODAL
      ================================================= */}

      {showScheduleModal && (
        <div
          className="teacher-schedule-overlay"
          onClick={() =>
            setShowScheduleModal(
              false
            )
          }
        >

          <div
            className="teacher-schedule-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <h3>
              Schedule Announcement
            </h3>


            <label>

              Date

              <input
                type="date"
                value={
                  scheduleDate
                }
                onChange={(
                  event
                ) =>
                  setScheduleDate(
                    event.target
                      .value
                  )
                }
              />

            </label>


            <label>

              Time

              <input
                type="time"
                value={
                  scheduleTime
                }
                onChange={(
                  event
                ) =>
                  setScheduleTime(
                    event.target
                      .value
                  )
                }
              />

            </label>


            <div className="teacher-schedule-buttons">

              <button
                type="button"
                onClick={() =>
                  setShowScheduleModal(
                    false
                  )
                }
              >
                Cancel
              </button>


              <button
                type="button"
                onClick={
                  scheduleAnnouncement
                }
              >
                Schedule
              </button>

            </div>

          </div>

        </div>
      )}

      {/* Custom Confirmation Popups */}
      <ConfirmationModal
        isOpen={Boolean(subjectToDelete)}
        title="Delete Subject?"
        message="Are you sure you want to delete this subject? All announcements, materials, and student enrollments inside it will also be permanently deleted."
        confirmText="Delete Subject"
        isDanger={true}
        onCancel={() => setSubjectToDelete(null)}
        onConfirm={executeDeleteSubject}
      />

      <ConfirmationModal
        isOpen={Boolean(announcementToDelete)}
        title="Delete Announcement?"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmText="Delete Announcement"
        isDanger={true}
        onCancel={() => setAnnouncementToDelete(null)}
        onConfirm={executeDeleteAnnouncement}
      />

      </div>
    </DashboardLayout>
  );
};


export default TeacherMySubjects;
