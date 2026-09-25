import FieldError from "./FieldError";
import "../styles/validation.css";
import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Link as LinkIcon,
  MoreVertical,
  Paperclip,
  Plus,
  Upload,
  Users,
  X,
} from 'lucide-react';
import api from '../services/api';
import { profilePictureUrl } from '../services/profile';
import { downloadFile } from '../services/download';
import '../styles/teacher-classwork.css';

const emptyForm = (type = 'assignment') => ({ type, title: '', instructions: '', points: '100', dueAt: '', scheduledAt: '', link: '' });
const labelFor = (type) => type === 'quiz' ? 'Quiz Assignment' : 'Assignment';
const localDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const formattedDate = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No due date';

export default function TeacherClasswork({ subject, teacherName }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const deleteRef = useRef(null);
  const createRef = useRef(null);
  const editorRef = useRef(null);
  const endpoint = `/subjects/${subject._id}/materials`;

  // Submissions state
  const [activeMaterialSubmissions, setActiveMaterialSubmissions] = useState(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState('');
  const [gradeInputs, setGradeInputs] = useState({});
  const [gradeFeedback, setGradeFeedback] = useState({});
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradingId, setGradingId] = useState(null);
  const [gradeNotice, setGradeNotice] = useState('');
  const submissionsDialogRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => api.get(endpoint, { signal: controller.signal })
      .then((response) => setMaterials(response.data))
      .catch((err) => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Unable to load classwork.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [endpoint]);

  const refresh = async () => {
    try { const response = await api.get(endpoint); setMaterials(response.data); }
    catch { setError('Your change was saved, but the list could not refresh. Reload this page to see it.'); }
  };

  const openEditor = (type, item = null) => {
    setFieldErrors({});
    setEditing(item || { _id: null });
    setForm(item ? { type: item.type || 'assignment', title: item.title, instructions: item.instructions || '', points: item.points == null ? '' : String(item.points), dueAt: localDate(item.dueAt), scheduledAt: localDate(item.scheduledAt), link: item.link || '' } : emptyForm(type));
    setFile(null); setRemoveAttachment(false); setShowLink(Boolean(item?.link)); setError(''); setSuccess('');
    if (createRef.current) createRef.current.open = false;
    requestAnimationFrame(() => { editorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); editorRef.current?.querySelector('input[name="title"]')?.focus(); });
  };

  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    const status = event.nativeEvent.submitter?.value || 'posted';
    if (status === 'scheduled' && (!form.scheduledAt || new Date(form.scheduledAt) <= new Date())) {
      setFieldErrors({ scheduledAt: 'Choose a future posting date and time.' });
      setError('Choose a future posting date and time before scheduling.'); return;
    }
    setBusy(true); setError(''); setSuccess(''); setFieldErrors({});
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) {
        body.append(key, ['dueAt', 'scheduledAt'].includes(key) ? (value ? new Date(value).toISOString() : '') : value);
      }
      body.append('status', status); body.append('removeAttachment', String(removeAttachment));
      if (file) body.append('attachment', file);
      if (editing._id) await api.put(`${endpoint}/${editing._id}`, body);
      else await api.post(endpoint, body);
      setEditing(null);
      setSuccess(`${labelFor(form.type)} ${status === 'draft' ? 'saved as a draft' : status === 'scheduled' ? 'scheduled' : 'posted'} successfully.`);
      await refresh();
    } catch (err) { setFieldErrors(err.response?.data?.errors || {}); setError(err.response?.data?.message || 'Unable to save classwork. Your changes are still in the editor.'); }
    finally { setBusy(false); }
  };

  const changeStatus = async (item, action) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await api.patch(`${endpoint}/${item._id}`, { action });
      setSuccess(action === 'archive' ? 'Classwork archived.' : 'Classwork restored to drafts.');
      if (editing?._id === item._id) setEditing(null);
      await refresh();
    } catch (err) { setError(err.response?.data?.message || 'Unable to update classwork.'); }
    finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    setBusy(true); setError('');
    try {
      await api.delete(`${endpoint}/${deleteTarget._id}`);
      if (editing?._id === deleteTarget._id) setEditing(null);
      deleteRef.current.close(); setDeleteTarget(null); setSuccess('Classwork deleted.'); await refresh();
    } catch (err) { setError(err.response?.data?.message || 'Unable to delete classwork.'); deleteRef.current.close(); }
    finally { setBusy(false); }
  };

  const download = async (item) => {
    setError('');
    try {
      const response = await api.get(`${endpoint}/${item._id}/attachment`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = item.attachmentName || 'Attachment';
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { setError('Unable to download the attachment. Please try again.'); }
  };

  const openSubmissionsModal = async (item) => {
    setActiveMaterialSubmissions({
      material: item,
      counts: { total: 0, turnedIn: 0, graded: 0, assigned: 0, missing: 0 },
      submissions: [],
    });
    setSubmissionsLoading(true);
    setSubmissionsError('');
    setGradeNotice('');
    submissionsDialogRef.current?.showModal();
    try {
      const res = await api.get(`/subjects/${subject._id}/materials/${item._id}/submissions`);
      setActiveMaterialSubmissions(res.data);
      const initialGrades = {};
      const initialFeedback = {};
      res.data.submissions.forEach((sub) => {
        if (sub.grade != null) initialGrades[sub._id] = String(sub.grade);
        if (sub.feedback) initialFeedback[sub._id] = sub.feedback;
      });
      setGradeInputs(initialGrades);
      setGradeFeedback(initialFeedback);
    } catch (err) {
      setSubmissionsError(err.response?.data?.message || 'Unable to load student submissions.');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const saveGrade = async (subId) => {
    if (!activeMaterialSubmissions || !subId) return;
    setGradeSaving(true);
    setGradingId(subId);
    setGradeNotice('');
    try {
      const gradeVal = gradeInputs[subId];
      const feedbackVal = gradeFeedback[subId];
      await api.post(
        `/subjects/${subject._id}/materials/${activeMaterialSubmissions.material._id}/submissions/${subId}/grade`,
        {
          grade: gradeVal === '' ? null : gradeVal,
          feedback: feedbackVal,
        }
      );
      setGradeNotice('Grade and feedback saved successfully.');
      const res = await api.get(`/subjects/${subject._id}/materials/${activeMaterialSubmissions.material._id}/submissions`);
      setActiveMaterialSubmissions(res.data);
    } catch (err) {
      setSubmissionsError(err.response?.data?.message || 'Unable to save grade.');
    } finally {
      setGradeSaving(false);
      setGradingId(null);
    }
  };

  const downloadStudentWork = async (sub) => {
    if (!activeMaterialSubmissions || !sub._id) return;
    try {
      await downloadFile(
        `/subjects/${subject._id}/materials/${activeMaterialSubmissions.material._id}/submissions/${sub._id}/attachment`,
        sub.attachmentName || 'Student_Work'
      );
    } catch (err) {
      alert(err.message || 'Unable to download student attachment.');
    }
  };

  const updateForm = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const posted = materials.filter((item) => !item.status || item.status === 'posted');
  const saved = materials.filter((item) => ['draft', 'scheduled', 'archived'].includes(item.status));

  const card = (item) => (
    <article className="classwork-card" key={item._id}>
      <div className="classwork-card-header">
        <div className="classwork-author"><span>{teacherName?.charAt(0).toUpperCase() || 'T'}</span><strong>{teacherName || 'Teacher'}</strong></div>
        {item.status && item.status !== 'posted' && <span className="classwork-status">{item.status}</span>}
        <details className="classwork-item-menu">
          <summary aria-label={`Actions for ${item.title}`}><MoreVertical size={20} /></summary>
          <div>
            {item.status !== 'archived' && <button type="button" disabled={busy} onClick={(event) => { event.currentTarget.closest('details').open = false; openEditor(item.type, item); }}>Edit</button>}
            <button type="button" disabled={busy} onClick={(event) => { event.currentTarget.closest('details').open = false; changeStatus(item, item.status === 'archived' ? 'restore' : 'archive'); }}>{item.status === 'archived' ? 'Restore to drafts' : 'Archive'}</button>
            <button type="button" disabled={busy} onClick={(event) => { event.currentTarget.closest('details').open = false; setDeleteTarget(item); deleteRef.current.showModal(); }}>Delete</button>
          </div>
        </details>
      </div>
      <div className="classwork-card-title"><h3>{labelFor(item.type)}: <span>{item.title}</span></h3><span>{item.points == null ? 'Ungraded' : `${item.points} Points`}</span></div>
      <p className="classwork-meta">Due: {formattedDate(item.dueAt)}</p>
      {item.status === 'scheduled' && <p className="classwork-meta">Posts: {formattedDate(item.scheduledAt)}</p>}
      {item.status === 'posted' && item.postedAt && <p className="classwork-meta">Posted: {formattedDate(item.postedAt)}</p>}
      {item.instructions && <p className="classwork-instructions">{item.instructions}</p>}
      <div className="classwork-attachments">
        {item.attachmentKey && <button type="button" onClick={() => download(item)}><FileText size={18} />{item.attachmentName}<small>{Math.max(1, Math.round(item.attachmentSize / 1024))} KB</small></button>}
        {item.fileUrl && /^(https?:\/\/|\/uploads\/)/.test(item.fileUrl) && <a href={new URL(item.fileUrl, new URL(api.defaults.baseURL, window.location.origin).origin).href} target="_blank" rel="noreferrer"><FileText size={18} />Attachment</a>}
        {item.link && /^https?:\/\//.test(item.link) && <a href={item.link} target="_blank" rel="noreferrer"><LinkIcon size={18} />Open attached link</a>}
      </div>

      {(!item.status || item.status === 'posted') && (
        <div className="classwork-card-submissions-row">
          <button
            type="button"
            className="classwork-submissions-btn"
            onClick={() => openSubmissionsModal(item)}
          >
            <Users size={16} />
            <span>View Submissions &amp; Grade</span>
          </button>
        </div>
      )}
    </article>
  );

  return <section className="teacher-classwork" aria-label="Materials">
    <div className="classwork-toolbar"><h2>Materials</h2><details className="classwork-create" ref={createRef}>
      <summary><Plus size={16} />Create</summary>
      <div><button type="button" onClick={() => openEditor('assignment')}><BookOpen size={17} />Assignment</button><button type="button" onClick={() => openEditor('quiz')}><BookOpen size={17} />Quiz Assignment</button></div>
    </details></div>
    {error && <div className="classwork-error" role="alert">{error}</div>}
    {success && <div className="classwork-success" role="status"><CheckCircle2 size={18} />{success}</div>}
    <details className="classwork-saved"><summary>Drafts and Archived <span>{saved.length}</span><ChevronDown size={18} /></summary>
      {['draft', 'scheduled', 'archived'].map((status) => <section key={status} aria-label={status}><h3>{status === 'draft' ? 'Drafts' : status === 'scheduled' ? 'Scheduled' : 'Archived'}</h3>{saved.filter((item) => item.status === status).map(card)}{!saved.some((item) => item.status === status) && <p className="classwork-muted">No {status === 'draft' ? 'drafts' : status + ' materials'}.</p>}</section>)}
    </details>

    {editing && <form className="classwork-editor" onSubmit={save} ref={editorRef}>
      <fieldset disabled={busy}>
        <div className="classwork-editor-heading"><h2>{labelFor(form.type)}</h2><button type="button" aria-label="Close editor" onClick={() => setEditing(null)}><X size={20} /></button></div>
        <div className="classwork-editor-options">
          <label>To<input value={`${subject.code}: ${subject.title}`} readOnly /></label>
          <label>Students<select aria-label="Recipients" defaultValue="all"><option value="all">All Students</option></select></label>
          <label>Points<select aria-label="Points" name="points" aria-invalid={Boolean(fieldErrors.points)} aria-describedby={fieldErrors.points ? "classwork-points-error" : undefined} value={['', '100'].includes(form.points) ? form.points : 'custom'} onChange={(event) => setForm((previous) => ({ ...previous, points: event.target.value === 'custom' ? '50' : event.target.value }))}><option value="100">100 Points</option><option value="">Ungraded</option><option value="custom">Custom points</option></select><span id="classwork-points-error"><FieldError errors={fieldErrors} name="points" /></span></label>
          {!['', '100'].includes(form.points) && <label>Custom points<input type="number" min="0" max="1000" name="points" aria-invalid={Boolean(fieldErrors.points)} aria-describedby={fieldErrors.points ? "classwork-points-error" : undefined} value={form.points} onChange={updateForm} /></label>}
          <label>Due date &amp; time<input type="datetime-local" name="dueAt" aria-invalid={Boolean(fieldErrors.dueAt)} aria-describedby={fieldErrors.dueAt ? "classwork-dueAt-error" : undefined} value={form.dueAt} onChange={updateForm} /><span id="classwork-dueAt-error"><FieldError errors={fieldErrors} name="dueAt" /></span></label>
        </div>
        <label className="classwork-field">Title<input name="title" aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "classwork-title-error" : undefined} placeholder="Title" required maxLength={200} value={form.title} onChange={updateForm} /><span id="classwork-title-error"><FieldError errors={fieldErrors} name="title" /></span></label>
        <label className="classwork-field">Instructions<textarea name="instructions" aria-invalid={Boolean(fieldErrors.instructions)} aria-describedby={fieldErrors.instructions ? "classwork-instructions-error" : undefined} placeholder="Type instructions..." rows={7} maxLength={20000} value={form.instructions} onChange={updateForm} /><span id="classwork-instructions-error"><FieldError errors={fieldErrors} name="instructions" /></span></label>
        <div className="classwork-attachment-controls"><label className="classwork-upload"><Upload size={19} />Attach file<input type="file" accept=".pdf,.txt,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected?.size > 10 * 1024 * 1024) { setError('Attachments must be 10 MB or smaller.'); event.target.value = ''; return; }
          setFile(selected || null); setError('');
        }} /></label><button type="button" onClick={() => setShowLink((show) => !show)}><LinkIcon size={19} />Add link</button><span>Up to 10 MB</span></div>
        {(file || (!removeAttachment && editing.attachmentName)) && <div className="classwork-selected-file"><FileText size={16} /><span>{file?.name || editing.attachmentName}</span><button type="button" onClick={() => { setFile(null); setRemoveAttachment(true); editorRef.current.querySelector('input[type="file"]').value = ''; }}>Remove</button></div>}
        {showLink && <label className="classwork-field">Attachment link<input type="url" name="link" aria-invalid={Boolean(fieldErrors.link)} aria-describedby={fieldErrors.link ? "classwork-link-error" : undefined} placeholder="https://..." value={form.link} onChange={updateForm} /><span id="classwork-link-error"><FieldError errors={fieldErrors} name="link" /></span></label>}
        <div className="classwork-editor-footer"><label>Schedule posting (optional)<input type="datetime-local" name="scheduledAt" aria-invalid={Boolean(fieldErrors.scheduledAt)} aria-describedby={fieldErrors.scheduledAt ? "classwork-scheduledAt-error" : undefined} value={form.scheduledAt} onChange={updateForm} /><span id="classwork-scheduledAt-error"><FieldError errors={fieldErrors} name="scheduledAt" /></span></label><div>
          <button type="button" onClick={() => setEditing(null)}>Cancel</button>
          <button type="submit" value="draft">Save Draft</button>
          <button type="submit" value="scheduled">Schedule</button>
          <button type="submit" value="posted" className="classwork-primary">{busy ? 'Saving...' : 'Post'}</button>
        </div></div>
      </fieldset>
    </form>}
    {loading ? <p role="status">Loading materials...</p> : <div className="classwork-posts">{posted.map(card)}{posted.length === 0 && !editing && <div className="classwork-empty"><BookOpen size={32} /><h3>No materials posted yet</h3><p>Use Create to add an assignment or quiz assignment.</p></div>}</div>}
    <dialog className="classwork-delete-dialog" ref={deleteRef} aria-labelledby="classwork-delete-title" onCancel={(event) => { if (busy) event.preventDefault(); }}>
      <h2 id="classwork-delete-title">Delete this {deleteTarget ? labelFor(deleteTarget.type).toLowerCase() : 'material'}?</h2><p>{deleteTarget?.title}</p><p>This action cannot be undone.</p><div><button type="button" disabled={busy} onClick={() => deleteRef.current.close()}>Cancel</button><button type="button" disabled={busy} className="classwork-danger" onClick={confirmDelete}>{busy ? 'Deleting...' : 'Delete'}</button></div>
    </dialog>

    <dialog
      className="teacher-submissions-modal"
      ref={submissionsDialogRef}
      onClose={() => setActiveMaterialSubmissions(null)}
      aria-labelledby="teacher-submissions-title"
    >
      <div className="submissions-modal-header">
        <div>
          <span className="teacher-eyebrow">STUDENT WORK</span>
          <h2 id="teacher-submissions-title">{activeMaterialSubmissions?.material?.title}</h2>
          <p className="submissions-modal-meta">
            {activeMaterialSubmissions?.material?.points != null ? `${activeMaterialSubmissions.material.points} Points` : 'Ungraded'}
            {activeMaterialSubmissions?.material?.dueAt ? ` · Due ${formattedDate(activeMaterialSubmissions.material.dueAt)}` : ' · No due date'}
          </p>
        </div>
        <button
          type="button"
          className="submissions-modal-close"
          aria-label="Close submissions"
          onClick={() => submissionsDialogRef.current?.close()}
        >
          <X size={20} />
        </button>
      </div>

      {submissionsLoading ? (
        <div className="submissions-modal-loading">Loading student submissions…</div>
      ) : submissionsError ? (
        <div className="classwork-error" role="alert">{submissionsError}</div>
      ) : activeMaterialSubmissions && (
        <>
          <div className="submissions-summary-counters">
            <div className="sub-stat-chip">
              <strong>{activeMaterialSubmissions.counts?.total || 0}</strong>
              <span>Enrolled</span>
            </div>
            <div className="sub-stat-chip highlight">
              <strong>{activeMaterialSubmissions.counts?.turnedIn || 0}</strong>
              <span>Turned In</span>
            </div>
            <div className="sub-stat-chip success">
              <strong>{activeMaterialSubmissions.counts?.graded || 0}</strong>
              <span>Graded</span>
            </div>
            <div className="sub-stat-chip warning">
              <strong>{activeMaterialSubmissions.counts?.missing || 0}</strong>
              <span>Missing</span>
            </div>
          </div>

          {gradeNotice && (
            <div className="classwork-success" role="status">
              <CheckCircle2 size={16} />
              {gradeNotice}
            </div>
          )}

          <div className="submissions-students-list">
            {!activeMaterialSubmissions.submissions?.length ? (
              <p className="classwork-muted">No students are currently enrolled in this subject.</p>
            ) : (
              activeMaterialSubmissions.submissions.map((sub) => {
                const isSubmitted = sub.status === 'submitted' || sub.status === 'graded';
                return (
                  <article className="submission-student-card" key={sub.student._id}>
                    <div className="submission-student-info">
                      <span className="submission-student-avatar">
                        {sub.student.profilePicture ? (
                          <img src={profilePictureUrl(sub.student.profilePicture)} alt="" />
                        ) : (
                          sub.student.name?.charAt(0).toUpperCase() || 'S'
                        )}
                      </span>
                      <div className="submission-student-names">
                        <strong>{sub.student.name}</strong>
                        <small>{sub.student.email}</small>
                      </div>
                      <span className={`turnin-badge turnin-badge-${sub.status === 'graded' ? 'graded' : sub.isLate ? 'late' : sub.status === 'submitted' ? 'ontime' : sub.status === 'missing' ? 'missing' : 'assigned'}`}>
                        {sub.status === 'graded' && <CheckCircle size={12} />}
                        {sub.status === 'submitted' && !sub.isLate && <CheckCircle size={12} />}
                        {sub.status === 'submitted' && sub.isLate && <Clock size={12} />}
                        {sub.status === 'missing' && <AlertCircle size={12} />}
                        {sub.status === 'graded' ? `Graded: ${sub.grade ?? 'Done'}/${activeMaterialSubmissions.material.points ?? 100}` : sub.isLate ? 'Turned in late' : sub.status === 'submitted' ? 'Turned in on time' : sub.status === 'missing' ? 'Missing' : 'Assigned'}
                      </span>
                    </div>

                    {isSubmitted ? (
                      <div className="submission-work-body">
                        {sub.attachmentName && (
                          <button
                            type="button"
                            className="submission-attachment-btn"
                            onClick={() => downloadStudentWork(sub)}
                            title="Download student attachment"
                          >
                            <Paperclip size={16} />
                            <span>{sub.attachmentName}</span>
                            <small>({Math.max(1, Math.round(sub.attachmentSize / 1024))} KB) · Click to Download</small>
                          </button>
                        )}
                        {sub.text && (
                          <p className="submission-student-note">
                            <strong>Student note:</strong> {sub.text}
                          </p>
                        )}
                        <small className="submission-time-label">
                          Submitted on {new Date(sub.submittedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}
                        </small>

                        <form
                          className="submission-grading-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            saveGrade(sub._id);
                          }}
                        >
                          <div className="submission-grading-inputs">
                            {activeMaterialSubmissions.material.points != null && (
                              <label className="grade-score-label">
                                <span>Score (out of {activeMaterialSubmissions.material.points})</span>
                                <div className="grade-score-input-wrap">
                                  <input
                                    type="number"
                                    min="0"
                                    max={activeMaterialSubmissions.material.points}
                                    placeholder="Grade"
                                    value={gradeInputs[sub._id] ?? (sub.grade != null ? String(sub.grade) : '')}
                                    onChange={(e) => setGradeInputs((p) => ({ ...p, [sub._id]: e.target.value }))}
                                  />
                                  <span>/ {activeMaterialSubmissions.material.points}</span>
                                </div>
                              </label>
                            )}
                            <label className="grade-feedback-label">
                              <span>Feedback / Remarks</span>
                              <input
                                type="text"
                                placeholder="Add private feedback to student…"
                                value={gradeFeedback[sub._id] ?? (sub.feedback || '')}
                                onChange={(e) => setGradeFeedback((p) => ({ ...p, [sub._id]: e.target.value }))}
                              />
                            </label>
                          </div>
                          <button
                            type="submit"
                            className="submission-save-grade-btn"
                            disabled={gradeSaving}
                          >
                            {gradeSaving && gradingId === sub._id ? 'Saving…' : sub.status === 'graded' ? 'Update Grade' : 'Save Grade'}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <p className="submission-not-turned-in">
                        {sub.status === 'missing' ? 'Student has not turned in work (past due date).' : 'No work turned in yet.'}
                      </p>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </dialog>
  </section>;
}
