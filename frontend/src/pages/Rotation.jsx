import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import AlertBanner from '../components/AlertBanner';
import DatePicker from '../components/DatePicker';
import { DeptBadge } from '../components/StatusBadge';
import ThemedSelect from '../components/theme/ThemedSelect';
import { useTheme } from '../context/ThemeContext';
import { useDepartments, useDeptName } from '../departments';
import { btn, btnPrimaryBase, card, inputClass, insetPanel, microLabel, primaryStyle } from '../ui/classes';
import { confirmDelete } from '../ui/confirm';

const EMPTY_FORM = { podId: '', blockCode: '', department: '', startsOn: null, endsOn: null };

export default function Rotation() {
  const { can } = useAuth();
  const { getThemeColor } = useTheme();
  const departments = useDepartments();
  const deptName = useDeptName();
  const DEPT_OPTIONS = departments.map((d) => ({ value: d.code, label: d.name }));
  const [rows, setRows] = useState(null);
  const [pods, setPods] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const canCreate = can('rotation', 'create');
  const canEdit = can('rotation', 'edit');
  const canDelete = can('rotation', 'delete');

  function reload() {
    api.get('/rotations').then(setRows).catch((e) => setError(e.message));
  }
  useEffect(reload, []);
  useEffect(() => {
    api.get('/pods').then(setPods).catch((e) => setError(e.message));
  }, []);

  async function createBlock() {
    setSaving(true);
    setError(null);
    try {
      await api.post('/rotations', form);
      setForm(EMPTY_FORM);
      setAdding(false);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setEditForm({ podId: r.podId, blockCode: r.blockCode, department: r.department, startsOn: r.startsOn, endsOn: r.endsOn });
  }

  async function saveEdit(id) {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/rotations/${id}`, editForm);
      setEditingId(null);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteBlock(r) {
    if (!(await confirmDelete(`${r.pod} · ${r.blockCode}`))) return;
    try {
      await api.delete(`/rotations/${r.id}`);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <AlertBanner level="crit">{error}</AlertBanner>;
  if (!rows || !pods) return <div className="text-sm text-gray-400">Loading…</div>;

  const podOptions = pods.map((p) => ({ value: p.id, label: p.name }));
  const byBlock = {};
  rows.forEach((r) => { (byBlock[r.blockCode] ??= []).push(r); });

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Every pod hosts every department once — one pod inside one department at a time.
        </p>
        {canCreate && (
          <button onClick={() => { setAdding((v) => !v); setForm(EMPTY_FORM); }}
            className={`${btn.secondary} flex items-center gap-1.5 text-sm flex-shrink-0`}>
            <Plus className="w-4 h-4" /> Add block
          </button>
        )}
      </div>

      {adding && (
        <div className={`${insetPanel} mb-4 space-y-2.5`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className={microLabel}>Pod</label>
              <ThemedSelect value={form.podId} placeholder="Pod" options={podOptions}
                onChange={(v) => setForm((f) => ({ ...f, podId: v }))} />
            </div>
            <div>
              <label className={microLabel}>Department</label>
              <ThemedSelect value={form.department} placeholder="Department" options={DEPT_OPTIONS}
                onChange={(v) => setForm((f) => ({ ...f, department: v }))} />
            </div>
            <div>
              <label className={microLabel}>Block label</label>
              <input className={inputClass()} placeholder="B1 or Month 2" value={form.blockCode}
                onChange={(e) => setForm((f) => ({ ...f, blockCode: e.target.value }))} />
            </div>
            <div>
              <label className={microLabel}>Dates</label>
              <div className="flex items-center gap-1.5">
                <DatePicker value={form.startsOn} placeholder="Start" onChange={(v) => setForm((f) => ({ ...f, startsOn: v }))} />
                <span className="text-gray-400 text-xs">–</span>
                <DatePicker value={form.endsOn} placeholder="End" onChange={(v) => setForm((f) => ({ ...f, endsOn: v }))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={createBlock}
              disabled={saving || !form.podId || !form.department || !form.blockCode || !form.startsOn || !form.endsOn}
              className={btnPrimaryBase} style={primaryStyle(getThemeColor())}>
              {saving ? 'Adding…' : 'Add block'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(byBlock).map(([block, blockRows]) => (
          <div key={block} className={card}>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{block}</h3>
            <div className="text-xs text-gray-400 mb-2">{blockRows[0].startsOn} – {blockRows[0].endsOn}</div>
            {blockRows.sort((a, b) => a.pod.localeCompare(b.pod)).map((r) => (
              <div key={r.id} className="py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                {editingId === r.id ? (
                  <div className="space-y-1.5 py-1">
                    <div className="grid grid-cols-2 gap-1.5">
                      <ThemedSelect value={editForm.podId} options={podOptions}
                        onChange={(v) => setEditForm((f) => ({ ...f, podId: v }))} />
                      <ThemedSelect value={editForm.department} options={DEPT_OPTIONS}
                        onChange={(v) => setEditForm((f) => ({ ...f, department: v }))} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input className={`${inputClass()} !py-1 text-xs`} value={editForm.blockCode}
                        onChange={(e) => setEditForm((f) => ({ ...f, blockCode: e.target.value }))} />
                      <DatePicker value={editForm.startsOn} onChange={(v) => setEditForm((f) => ({ ...f, startsOn: v }))} />
                      <DatePicker value={editForm.endsOn} onChange={(v) => setEditForm((f) => ({ ...f, endsOn: v }))} />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => saveEdit(r.id)} disabled={saving} className={`${btn.secondary} !px-2.5 !py-1 text-xs`}>Save</button>
                      <button onClick={() => setEditingId(null)} className={`${btn.secondary} !px-2.5 !py-1 text-xs`}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-white">{r.pod}</span>
                    <div className="flex items-center gap-1.5">
                      <DeptBadge department={r.department} name={deptName(r.department)} />
                      {canEdit && (
                        <button onClick={() => startEdit(r)} title="Edit"
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => deleteBlock(r)} title="Delete"
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
