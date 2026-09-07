import { Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { btn, btnPrimaryBase, card, inputClass, label as labelClass, microLabel, primaryStyle } from '../ui/classes';
import { confirmDelete } from '../ui/confirm';
import AlertBanner from './AlertBanner';
import { BandBadge } from './StatusBadge';
import Drawer from './Drawer';
import ThemedSelect from './theme/ThemedSelect';

const STATUSES = ['active', 'exited', 'gateway_passed', 'confirmed'];

const emptyForm = { name: '', phone: '', email: '', password: '', branch: '', pod: 1, baseline: '', status: 'active' };

export default function TraineeDrawer({ code, onClose, onSaved }) {
  const { getThemeColor } = useTheme();
  const { can } = useAuth();
  const isCreate = !code;
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pods, setPods] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Pods are no longer a fixed set of 4 — fetch the real, current list (see
  // PodBuddyPanel.jsx, backend/src/routes/pods.js) instead of hardcoding.
  useEffect(() => {
    api.get('/pods').then(setPods).catch(() => {});
  }, []);

  useEffect(() => {
    if (isCreate) {
      setForm(emptyForm);
      setDetail(null);
      return;
    }
    api.get(`/trainees/${code}`).then((d) => {
      setDetail(d);
      setForm({
        name: d.name, phone: d.phone ?? '', email: d.email ?? '',
        branch: d.branch ?? '', pod: d.pod, baseline: d.baseline ?? '', status: d.status,
      });
    }).catch((e) => setError(e.message));
  }, [code, isCreate]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        branch: form.branch,
        pod: Number(form.pod),
        baseline: form.baseline === '' ? null : Number(form.baseline),
      };
      if (form.password) body.password = form.password;
      if (isCreate) {
        await api.post('/trainees', body);
      } else {
        await api.put(`/trainees/${code}`, { ...body, status: form.status });
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const baselineLocked = !isCreate && detail?.baseline != null;

  async function remove() {
    if (!(await confirmDelete(detail?.name ?? code))) return;
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/trainees/${code}`);
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <Drawer
      title={isCreate ? 'Add trainee' : (detail?.name ?? code)}
      subtitle={!isCreate && detail ? `${code} · Pod ${detail.pod} · ${detail.branch}` : undefined}
      icon={User}
      onClose={onClose}
    >
      {error && <AlertBanner level="crit">{error}</AlertBanner>}

      {!isCreate && detail && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <BandBadge band={detail.band} />
            <span className="text-xs text-gray-500 dark:text-gray-400">Site buddy: {detail.buddy ?? '—'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={card}>
              <div className={microLabel}>Checkpoint</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{detail.checkpoint ?? '—'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {detail.checkpoint != null
                  ? `Written ${detail.written} + Practical ${detail.practical} + Behavioural ${detail.behavioural}`
                  : 'Not yet assessed'}
              </div>
            </div>
            <div className={card}>
              <div className={microLabel}>Velocity</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{detail.velocity ?? '—'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{detail.baseline} → {detail.checkpoint ?? '?'} out of 100</div>
            </div>
          </div>
        </>
      )}

      <div className={card}>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{isCreate ? 'New trainee' : 'Edit'}</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Name</label>
            <input className={inputClass()} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass()} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass()} value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>{isCreate ? 'Password (optional — enables email login)' : 'New password (leave blank to keep current)'}</label>
            <input className={inputClass()} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
            <div className="text-xs text-gray-400 mt-1">Phone + OTP always works regardless. This adds email + password as a second way in.</div>
          </div>
          <div>
            <label className={labelClass}>Branch / college</label>
            <input className={inputClass()} value={form.branch} onChange={(e) => set('branch', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Pod</label>
              <ThemedSelect value={form.pod} onChange={(v) => set('pod', v)}
                options={(pods ?? [])
                  .map((p) => ({ value: parseInt(String(p.name).replace(/\D/g, ''), 10), label: p.name }))
                  .sort((a, b) => a.value - b.value)} />
            </div>
            <div>
              <label className={labelClass}>Baseline (D01)</label>
              <input className={inputClass()} type="number" min={0} max={100}
                value={form.baseline} disabled={baselineLocked}
                onChange={(e) => set('baseline', e.target.value)} />
              {baselineLocked && <div className="text-xs text-gray-400 mt-1">Locked once set</div>}
            </div>
            {!isCreate && (
              <div>
                <label className={labelClass}>Status</label>
                <ThemedSelect value={form.status} onChange={(v) => set('status', v)}
                  options={STATUSES.map((s) => ({ value: s, label: s }))} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={save} disabled={saving || !form.name} className={btnPrimaryBase} style={primaryStyle(getThemeColor())}>
            {saving ? 'Saving…' : isCreate ? 'Add trainee' : 'Save changes'}
          </button>
          {!isCreate && can('trainees', 'delete') && (
            <button onClick={remove} disabled={saving} className={`${btn.danger} flex items-center gap-1.5`}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {!isCreate && detail?.history && (
        <div className={card}>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Daily record</h3>
          <div className="max-h-64 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-left">Day</th><th className="px-3 py-2 text-left">Attendance</th>
                  <th className="px-3 py-2 text-left">Log score</th><th className="px-3 py-2 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {detail.history.map((h) => (
                  <tr key={h.code} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="px-3 py-2">{h.code} · {h.label}</td>
                    <td className="px-3 py-2 font-mono">{h.attendance ?? '—'}</td>
                    <td className="px-3 py-2 font-mono">{h.log_score ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{h.log_note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Drawer>
  );
}
