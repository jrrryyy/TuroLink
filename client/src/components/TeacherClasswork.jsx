import { useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, FileText, Link as LinkIcon, MoreVertical, Plus, Upload, X } from 'lucide-react';
import api from '../services/api';
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
      setError('Choose a future posting date and time before scheduling.'); return;
    }
    setBusy(true); setError(''); setSuccess('');
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
    } catch (err) { setError(err.response?.data?.message || 'Unable to save classwork. Your changes are still in the editor.'); }
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
    </article>
  );

  return <section className="teacher-classwork" aria-label="Classwork">
    <div className="classwork-toolbar"><h2>Classwork</h2><details className="classwork-create" ref={createRef}>
      <summary><Plus size={16} />Create</summary>
      <div><button type="button" onClick={() => openEditor('assignment')}><BookOpen size={17} />Assignment</button><button type="button" onClick={() => openEditor('quiz')}><BookOpen size={17} />Quiz Assignment</button></div>
    </details></div>
    {error && <div className="classwork-error" role="alert">{error}</div>}
    {success && <div className="classwork-success" role="status"><CheckCircle2 size={18} />{success}</div>}
    <details className="classwork-saved"><summary>Drafts and Archived <span>{saved.length}</span><ChevronDown size={18} /></summary>
      {['draft', 'scheduled', 'archived'].map((status) => <section key={status} aria-label={status}><h3>{status === 'draft' ? 'Drafts' : status === 'scheduled' ? 'Scheduled' : 'Archived'}</h3>{saved.filter((item) => item.status === status).map(card)}{!saved.some((item) => item.status === status) && <p className="classwork-muted">No {status === 'draft' ? 'drafts' : status + ' classwork'}.</p>}</section>)}
    </details>

    {editing && <form className="classwork-editor" onSubmit={save} ref={editorRef}>
      <fieldset disabled={busy}>
        <div className="classwork-editor-heading"><h2>{labelFor(form.type)}</h2><button type="button" aria-label="Close editor" onClick={() => setEditing(null)}><X size={20} /></button></div>
        <div className="classwork-editor-options">
          <label>To<input value={`${subject.code}: ${subject.title}`} readOnly /></label>
          <label>Students<select aria-label="Recipients" defaultValue="all"><option value="all">All Students</option></select></label>
          <label>Points<select aria-label="Points" name="points" value={['', '100'].includes(form.points) ? form.points : 'custom'} onChange={(event) => setForm((previous) => ({ ...previous, points: event.target.value === 'custom' ? '50' : event.target.value }))}><option value="100">100 Points</option><option value="">Ungraded</option><option value="custom">Custom points</option></select></label>
          {!['', '100'].includes(form.points) && <label>Custom points<input type="number" min="0" max="1000" name="points" value={form.points} onChange={updateForm} /></label>}
          <label>Due date &amp; time<input type="datetime-local" name="dueAt" value={form.dueAt} onChange={updateForm} /></label>
        </div>
        <label className="classwork-field">Title<input name="title" placeholder="Title" required maxLength={200} value={form.title} onChange={updateForm} /></label>
        <label className="classwork-field">Instructions<textarea name="instructions" placeholder="Type instructions..." rows={7} maxLength={20000} value={form.instructions} onChange={updateForm} /></label>
        <div className="classwork-attachment-controls"><label className="classwork-upload"><Upload size={19} />Attach file<input type="file" accept=".pdf,.txt,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected?.size > 10 * 1024 * 1024) { setError('Attachments must be 10 MB or smaller.'); event.target.value = ''; return; }
          setFile(selected || null); setError('');
        }} /></label><button type="button" onClick={() => setShowLink((show) => !show)}><LinkIcon size={19} />Add link</button><span>Up to 10 MB</span></div>
        {(file || (!removeAttachment && editing.attachmentName)) && <div className="classwork-selected-file"><FileText size={16} /><span>{file?.name || editing.attachmentName}</span><button type="button" onClick={() => { setFile(null); setRemoveAttachment(true); editorRef.current.querySelector('input[type="file"]').value = ''; }}>Remove</button></div>}
        {showLink && <label className="classwork-field">Attachment link<input type="url" name="link" placeholder="https://..." value={form.link} onChange={updateForm} /></label>}
        <div className="classwork-editor-footer"><label>Schedule posting (optional)<input type="datetime-local" name="scheduledAt" value={form.scheduledAt} onChange={updateForm} /></label><div>
          <button type="button" onClick={() => setEditing(null)}>Cancel</button>
          <button type="submit" value="draft">Save Draft</button>
          <button type="submit" value="scheduled">Schedule</button>
          <button type="submit" value="posted" className="classwork-primary">{busy ? 'Saving...' : 'Post'}</button>
        </div></div>
      </fieldset>
    </form>}
    {loading ? <p role="status">Loading classwork...</p> : <div className="classwork-posts">{posted.map(card)}{posted.length === 0 && !editing && <div className="classwork-empty"><BookOpen size={32} /><h3>No classwork posted yet</h3><p>Use Create to add an assignment or quiz assignment.</p></div>}</div>}
    <dialog className="classwork-delete-dialog" ref={deleteRef} aria-labelledby="classwork-delete-title" onCancel={(event) => { if (busy) event.preventDefault(); }}>
      <h2 id="classwork-delete-title">Delete this {deleteTarget ? labelFor(deleteTarget.type).toLowerCase() : 'classwork'}?</h2><p>{deleteTarget?.title}</p><p>This action cannot be undone.</p><div><button type="button" disabled={busy} onClick={() => deleteRef.current.close()}>Cancel</button><button type="button" disabled={busy} className="classwork-danger" onClick={confirmDelete}>{busy ? 'Deleting...' : 'Delete'}</button></div>
    </dialog>
  </section>;
}
