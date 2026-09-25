import TeacherAnnouncementInteraction from '../components/TeacherAnnouncementInteraction';
import { downloadFile } from '../services/download';
import { validateSubject, validateAnnouncement as announcementErrors } from "../../../shared/validation.mjs";
import FieldError from "../components/FieldError";
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
  Paperclip,
  Plus,
  Trash2,
  X,
} from "lucide-react";


import { useTheme } from "../context/ThemeContext";
import TeacherClasswork from "../components/TeacherClasswork";
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
  const searchTerm = searchParams.get("q") || "";
  const filteredSubjects = subjects.filter((subject) =>
    [subject.code, subject.title, subject.description].some((value) => value?.toLowerCase().includes(searchTerm.trim().toLowerCase()))
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
    code: "",
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
      setAnnouncementContent(
        ""
      );

      setAnnouncementFile(
        null
      );

      setAnnouncementLink(
        ""
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
            code:
              subjectForm.code.trim(),

            title:
              subjectForm.title.trim(),

            description:
              subjectForm.description.trim(),
          }
        );

        setSubjectForm({
          code: "",
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

  const handleDeleteSubject =
    async (subjectId) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this subject? All announcements inside it will also be deleted."
        );

      if (!confirmed) {
        return;
      }

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
    const errors = announcementErrors({ content: announcementContent, link: announcementLink }, announcementFile);
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

        const response =
          await api.post(
            `/subjects/${selectedSubject._id}/announcements`,
            formData
          );

        clearAnnouncementForm();

        setShowAnnouncementComposer(
          false
        );

        setSuccessMessage(
          response.data?.message ||
            "Announcement posted successfully."
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
  // DELETE ANNOUNCEMENT
  // =====================================================

  const handleDeleteAnnouncement =
    async (
      announcementId
    ) => {
      if (
        !selectedSubject?._id
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this announcement?"
        );

      if (!confirmed) {
        return;
      }

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

                <CheckCircle2
                  size={17}
                />

                {successMessage}

              </div>
            )}


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
                          {subject.code}:{" "}
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
                  {selectedSubject.code}
                  :{" "}
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
                Classwork
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
                      New Announcement
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
                      {selectedSubject.code}
                      :{" "}
                      {selectedSubject.title}
                    </span>

                    <span>
                      All Students
                    </span>

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
                        Post
                      </button>


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

                              <small>
                                {formatAnnouncementTime(
                                  announcement
                                )}
                              </small>


                              <button
                                type="button"
                                className="teacher-announcement-delete"
                                title="Delete announcement"
                                onClick={() =>
                                  handleDeleteAnnouncement(
                                    announcement._id
                                  )
                                }
                              >
                                <Trash2
                                  size={15}
                                />
                              </button>

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

              Subject Code

              <input
                type="text"
                name="code" aria-invalid={Boolean(subjectErrors.code)} aria-describedby={subjectErrors.code ? "code-error" : undefined}
                placeholder="ITE 314"
                value={
                  subjectForm.code
                }
                onChange={
                  handleSubjectChange
                }
                required
              />

            <FieldError errors={subjectErrors} name="code" /></label>


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

      </div>
    </DashboardLayout>
  );
};


export default TeacherMySubjects;
