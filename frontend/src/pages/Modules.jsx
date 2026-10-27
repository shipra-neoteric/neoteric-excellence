import { FileText, Image as ImageIcon, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import AlertBanner from '../components/AlertBanner';
import DatePicker from '../components/DatePicker';
import { DeptBadge, VIDEO_STATUS_BADGE } from '../components/StatusBadge';
import ThemedSelect from '../components/theme/ThemedSelect';
import YouTubePlayer from '../components/YouTubePlayer';
import { useTheme } from '../context/ThemeContext';
import { useDepartments, useDeptName } from '../departments';
import { btn, btnPrimaryBase, inputClass, insetPanel, microLabel, primaryStyle } from '../ui/classes';
import { confirmDelete } from '../ui/confirm';
import { fileToDataUrl } from '../ui/file';

const EMPTY_MODULE_FORM = { code: '', title: '', department: '', sequence: '', releaseDate: null };

function fileIcon(fileType, fileName) {
  const ext = (fileName ?? '').split('.').pop()?.toLowerCase();
  if (fileType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return ImageIcon;
  return FileText;
}

export default function Modules() {
  const { can } = useAuth();
  const { getThemeColor } = useTheme();
  const departments = useDepartments();
  const deptName = useDeptName();
  const DEPT_OPTIONS = departments.map((d) => ({ value: d.code, label: d.name }));
  const DEPT_TABS = [{ value: '', label: 'All' }, ...DEPT_OPTIONS];
  const [modules, setModules] = useState(null);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [addingVideoFor, setAddingVideoFor] = useState(null);
  const [addingNoteFor, setAddingNoteFor] = useState(null);
  const [url, setUrl] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteFile, setNoteFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addingModule, setAddingModule] = useState(false);
  const [moduleForm, setModuleForm] = useState(EMPTY_MODULE_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', department: '', sequence: '' });
  const [deptFilter, setDeptFilter] = useState('');
  const [query, setQuery] = useState('');

  const canAddContent = can('content', 'create');
  const canApprove = can('content', 'approve');
  const canDelete = can('content', 'delete');
  const canEdit = can('content', 'edit');

  function reload() {
    api.get('/modules?with=videos').then(setModules).catch((e) => setError(e.message));
  }
  useEffect(reload, []);

  async function createModule() {
    setSaving(true);
    setError(null);
    try {
      await api.post('/modules', {
        code: moduleForm.code.trim(),
        title: moduleForm.title.trim(),
        department: moduleForm.department,
        sequence: Number(moduleForm.sequence),
        releaseDate: moduleForm.releaseDate,
      });
      setModuleForm(EMPTY_MODULE_FORM);
      setAddingModule(false);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(m) {
    setEditingId(m._id);
    setEditForm({ title: m.title, department: m.department, sequence: String(m.sequence) });
  }

  async function saveEdit(moduleId) {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/modules/${moduleId}`, {
        title: editForm.title.trim(),
        department: editForm.department,
        sequence: Number(editForm.sequence),
      });
      setEditingId(null);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteModule(m) {
    if (!(await confirmDelete(m.title))) return;
    try {
      await api.delete(`/modules/${m._id}`);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addVideo(moduleId) {
    if (!url) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/videos', { module_id: moduleId, url });
      setUrl('');
      setAddingVideoFor(null);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function addNote(moduleId) {
    if (!noteTitle || !noteFile) return;
    setSaving(true);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(noteFile);
      await api.post(`/modules/${moduleId}/notes`, {
        title: noteTitle, dataUrl, fileName: noteFile.name, fileType: noteFile.type,
      });
      setNoteTitle('');
      setNoteFile(null);
      setAddingNoteFor(null);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function approve(videoId) {
    try {
      await api.put(`/videos/${videoId}/approve`, {});
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteVideo(v) {
    if (!(await confirmDelete(v.title ?? v.youtubeId))) return;
    try {
      await api.delete(`/videos/${v._id}`);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteNote(n) {
    if (!(await confirmDelete(n.title))) return;
    try {
      await api.delete(`/modules/notes/${n._id}`);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function setReleaseDate(moduleId, value) {
    try {
      await api.put(`/modules/${moduleId}`, { releaseDate: value || null });
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <AlertBanner level="crit">{error}</AlertBanner>;
  if (!modules) return <div className="text-sm text-gray-400">Loading…</div>;

  const visibleModules = modules.filter((m) => {
    if (deptFilter && m.department !== deptFilter) return false;
    if (query && !`${m.code} ${m.title}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${inputClass()} pl-9`} placeholder="Search code or title…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 w-fit">
          {DEPT_TABS.map((d) => (
            <button key={d.value} onClick={() => setDeptFilter(d.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                deptFilter === d.value ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'
              }`}>
              {d.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{visibleModules.length} of {modules.length}</span>
        {canAddContent && (
          <button onClick={() => { setAddingModule((v) => !v); setModuleForm(EMPTY_MODULE_FORM); }}
            className={`${btn.secondary} flex items-center gap-1.5 text-sm`}>
            <Plus className="w-4 h-4" /> Add module
          </button>
        )}
      </div>

      {addingModule && (
        <div className={`${insetPanel} space-y-2.5`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className={microLabel}>Code</label>
              <input className={inputClass()} placeholder="M23" value={moduleForm.code}
                onChange={(e) => setModuleForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={microLabel}>Title</label>
              <input className={inputClass()} value={moduleForm.title}
                onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className={microLabel}>Department</label>
              <ThemedSelect value={moduleForm.department} placeholder="Department"
                onChange={(v) => setModuleForm((f) => ({ ...f, department: v }))} options={DEPT_OPTIONS} />
            </div>
            <div>
              <label className={microLabel}>Sequence</label>
              <input type="number" className={inputClass()} value={moduleForm.sequence}
                onChange={(e) => setModuleForm((f) => ({ ...f, sequence: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <DatePicker value={moduleForm.releaseDate} placeholder="Release date (optional)"
              onChange={(v) => setModuleForm((f) => ({ ...f, releaseDate: v }))} />
            <button onClick={createModule} disabled={saving || !moduleForm.code || !moduleForm.title || !moduleForm.department || !moduleForm.sequence}
              className={btnPrimaryBase} style={primaryStyle(getThemeColor())}>
              {saving ? 'Adding…' : 'Create module'}
            </button>
          </div>
        </div>
      )}

      {visibleModules.length === 0 && (
        <div className="text-center text-sm text-gray-400 py-8">No modules match these filters.</div>
      )}
      {visibleModules.map((m) => (
        <div key={m._id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3.5">
          <div className="flex items-center gap-3 mb-2.5 flex-wrap">
            <span className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">{m.code}</span>

            {editingId === m._id ? (
              <>
                <input className={`${inputClass()} !w-auto flex-1 min-w-[140px] !py-1 text-sm`} value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
                <div className="w-36">
                  <ThemedSelect value={editForm.department} options={DEPT_OPTIONS}
                    onChange={(v) => setEditForm((f) => ({ ...f, department: v }))} />
                </div>
                <input type="number" title="Sequence" className={`${inputClass()} !w-16 !py-1 text-xs`} value={editForm.sequence}
                  onChange={(e) => setEditForm((f) => ({ ...f, sequence: e.target.value }))} />
              </>
            ) : (
              <>
                <span className="flex-1 font-semibold text-gray-900 dark:text-white min-w-[140px]">{m.title}</span>
                <DeptBadge department={m.department} name={deptName(m.department)} />
              </>
            )}

            {canEdit && (
              <DatePicker value={m.releaseDate ? m.releaseDate.slice(0, 10) : null}
                onChange={(v) => setReleaseDate(m._id, v)} />
            )}

            {canEdit && (
              editingId === m._id ? (
                <>
                  <button onClick={() => saveEdit(m._id)} disabled={saving} className={`${btn.secondary} !px-2.5 !py-1 text-xs`}>Save</button>
                  <button onClick={() => setEditingId(null)} className={`${btn.secondary} !px-2.5 !py-1 text-xs`}>Cancel</button>
                </>
              ) : (
                <button onClick={() => startEdit(m)} title="Edit module"
                  className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )
            )}

            {canDelete && (
              <button onClick={() => deleteModule(m)} title="Delete module"
                className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {canAddContent && (
              <button onClick={() => { setAddingVideoFor(addingVideoFor === m._id ? null : m._id); setUrl(''); }}
                className={`${btn.secondary} flex items-center gap-1 !px-2.5 !py-1 text-xs`}>
                <Plus className="w-3 h-3" /> Video
              </button>
            )}
            {canAddContent && (
              <button onClick={() => { setAddingNoteFor(addingNoteFor === m._id ? null : m._id); setNoteTitle(''); setNoteFile(null); }}
                className={`${btn.secondary} flex items-center gap-1 !px-2.5 !py-1 text-xs`}>
                <Plus className="w-3 h-3" /> Attachment
              </button>
            )}
          </div>

          {addingVideoFor === m._id && (
            <div className="flex gap-2 mb-3">
              <input className={inputClass()} placeholder="Paste a YouTube URL"
                value={url} onChange={(e) => setUrl(e.target.value)} />
              <button onClick={() => addVideo(m._id)} disabled={saving} className={btnPrimaryBase} style={primaryStyle(getThemeColor())}>
                {saving ? 'Adding…' : 'Add'}
              </button>
            </div>
          )}

          {addingNoteFor === m._id && (
            <div className={`${insetPanel} mb-3 space-y-2`}>
              <input className={inputClass()} placeholder="Attachment title"
                value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
              <input type="file" accept=".pdf,.doc,.docx,image/*"
                onChange={(e) => setNoteFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-200" />
              <button onClick={() => addNote(m._id)} disabled={saving || !noteTitle || !noteFile}
                className={btnPrimaryBase} style={primaryStyle(getThemeColor())}>
                {saving ? 'Uploading…' : 'Add attachment'}
              </button>
            </div>
          )}

          {m.notes?.length > 0 && (
            <div className="space-y-2 mb-3">
              {m.notes.map((n) => {
                const Icon = n.fileUrl ? fileIcon(n.fileType, n.fileName) : FileText;
                return (
                  <a key={n._id} href={n.fileUrl} target={n.fileUrl ? '_blank' : undefined} rel="noreferrer"
                    className={`${insetPanel} flex items-start gap-2.5 ${n.fileUrl ? 'hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer' : ''}`}>
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</div>
                      {n.fileName && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.fileName}</div>}
                      {!n.fileUrl && n.body && <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{n.body}</div>}
                    </div>
                    {canDelete && (
                      <button onClick={(e) => { e.preventDefault(); deleteNote(n); }}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </a>
                );
              })}
            </div>
          )}

          {m.videos.length > 0 && (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {m.videos.map((v) => (
                <div key={v._id} className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-orange-300 dark:hover:border-orange-700 transition-colors">
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center cursor-pointer" onClick={() => setPlaying(v)}>
                    <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">{v.title ?? v.youtubeId}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{v.channel}</div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${VIDEO_STATUS_BADGE[v.status]}`}>
                        {v.status}
                      </span>
                      {canApprove && v.status === 'suggested' && (
                        <button onClick={() => approve(v._id)} className={`${btn.secondary} !px-2 !py-0.5 text-[11px]`}>
                          Approve
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => deleteVideo(v)} className="ml-auto w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {playing && <YouTubePlayer video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
