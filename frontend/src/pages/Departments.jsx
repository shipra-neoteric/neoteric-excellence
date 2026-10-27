import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import AlertBanner from '../components/AlertBanner';
import { useTheme } from '../context/ThemeContext';
import { invalidateDepartments, useDepartments } from '../departments';
import { btn, btnPrimaryBase, inputClass, insetPanel, microLabel, primaryStyle } from '../ui/classes';
import { confirmDelete } from '../ui/confirm';

const EMPTY_FORM = { code: '', name: '' };

export default function Departments() {
  const { can } = useAuth();
  const { getThemeColor } = useTheme();
  const departments = useDepartments();
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingCode, setEditingCode] = useState(null);
  const [editName, setEditName] = useState('');

  const canCreate = can('rotation', 'create');
  const canEdit = can('rotation', 'edit');
  const canDelete = can('rotation', 'delete');

  async function create() {
    setSaving(true);
    setError(null);
    try {
      await api.post('/departments', form);
      setForm(EMPTY_FORM);
      setAdding(false);
      await invalidateDepartments();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(code) {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/departments/${code}`, { name: editName });
      setEditingCode(null);
      await invalidateDepartments();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(d) {
    if (!(await confirmDelete(d.name))) return;
    try {
      await api.delete(`/departments/${d.code}`);
      await invalidateDepartments();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Departments trainees, modules and the rotation schedule are divided into. Add one here to run a different
        trade's program, or rename/remove the existing ones.
      </p>

      {error && <AlertBanner level="crit">{error}</AlertBanner>}

      {canCreate && (
        <div className="flex justify-end">
          <button onClick={() => { setAdding((v) => !v); setForm(EMPTY_FORM); }}
            className={`${btn.secondary} flex items-center gap-1.5 text-sm`}>
            <Plus className="w-4 h-4" /> Add department
          </button>
        </div>
      )}

      {adding && (
        <div className={`${insetPanel} space-y-2.5`}>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={microLabel}>Code (short, e.g. QC)</label>
              <input className={inputClass()} value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className={microLabel}>Name</label>
              <input className={inputClass()} value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={create} disabled={saving || !form.code || !form.name}
              className={btnPrimaryBase} style={primaryStyle(getThemeColor())}>
              {saving ? 'Adding…' : 'Add department'}
            </button>
          </div>
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
        {departments.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No departments yet.</div>
        )}
        {departments.map((d) => (
          <div key={d.code} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400 w-14 flex-shrink-0">{d.code}</span>
            {editingCode === d.code ? (
              <>
                <input className={`${inputClass()} flex-1`} value={editName} onChange={(e) => setEditName(e.target.value)} />
                <button onClick={() => saveEdit(d.code)} disabled={saving} className={`${btn.secondary} !px-2.5 !py-1 text-xs`}>Save</button>
                <button onClick={() => setEditingCode(null)} className={`${btn.secondary} !px-2.5 !py-1 text-xs`}>Cancel</button>
              </>
            ) : (
              <>
                <span className="flex-1 font-semibold text-gray-900 dark:text-white">{d.name}</span>
                {canEdit && (
                  <button onClick={() => { setEditingCode(d.code); setEditName(d.name); }} title="Rename"
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => remove(d)} title="Delete"
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
