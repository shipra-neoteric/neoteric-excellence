import { useEffect, useState } from 'react';
import { api } from '../api/client';
import AlertBanner from '../components/AlertBanner';
import { BandBadge } from '../components/StatusBadge';
import ThemedSelect from '../components/theme/ThemedSelect';
import { useTheme } from '../context/ThemeContext';
import { useDepartments, useDeptName } from '../departments';
import { btnPrimaryBase, inputClass, primaryStyle } from '../ui/classes';

const MAX = { written: 40, practical: 30, behavioural: 30 };
const KINDS = [
  { key: 'checkpoint', label: 'Checkpoint' },
  { key: 'drill', label: 'Department drill' },
  { key: 'gateway', label: 'Gateway' },
];

function velocityOf(baseline, chk) {
  if (chk == null) return null;
  return Math.round(((chk - baseline) / (100 - baseline)) * 1000) / 10;
}
function bandOf(baseline, chk) {
  const v = velocityOf(baseline, chk);
  if (v == null) return null;
  if (chk >= 75 && v >= 55) return 'A';
  if (chk >= 60) return 'B';
  if (chk >= 45) return 'C';
  return 'D';
}

function MarkInput({ max, value, onChange }) {
  return (
    <input className={inputClass()} style={{ width: 64 }} type="number" min={0} max={max}
      value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
  );
}

export default function Assessment() {
  const { getThemeColor } = useTheme();
  const departments = useDepartments();
  const deptName = useDeptName();
  const [kind, setKind] = useState('checkpoint');
  const [department, setDepartment] = useState('');
  const [podFilter, setPodFilter] = useState('');
  const [rows, setRows] = useState(null);
  const [marks, setMarks] = useState({}); // used for drill/gateway — checkpoint reuses rows directly
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/trainees').then(setRows).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!department && departments.length) setDepartment(departments[0].code);
  }, [department, departments]);

  useEffect(() => {
    setMarks({});
    setSaved(false);
  }, [kind, department]);

  function setCheckpointMark(traineeId, field, raw) {
    const value = raw === '' ? null : Math.max(0, Math.min(MAX[field], Number(raw)));
    setRows((rs) => rs.map((r) => r.id === traineeId ? { ...r, [field]: value } : r));
    setSaved(false);
  }

  function setOtherMark(traineeId, field, raw) {
    const value = raw === '' ? null : Math.max(0, Math.min(MAX[field], Number(raw)));
    setMarks((m) => ({ ...m, [traineeId]: { ...m[traineeId], [field]: value } }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (kind === 'checkpoint') {
        await api.put('/assessments/checkpoint/bulk', rows
          .filter((r) => r.written != null && r.practical != null && r.behavioural != null)
          .map((r) => ({ trainee_id: r.id, written: r.written, practical: r.practical, behavioural: r.behavioural })));
      } else {
        const entries = Object.entries(marks)
          .filter(([, m]) => m.written != null && m.practical != null && m.behavioural != null)
          .map(([traineeId, m]) => ({
            trainee_id: traineeId, written: m.written, practical: m.practical, behavioural: m.behavioural,
            ...(kind === 'drill' ? { department } : {}),
          }));
        await api.put(`/assessments/${kind}/bulk`, entries);
      }
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <AlertBanner level="crit">{error}</AlertBanner>;
  if (!rows) return <div className="text-sm text-gray-400">Loading…</div>;

  const podOptions = [
    { value: '', label: 'All pods' },
    ...[...new Set(rows.map((r) => r.pod))].sort((a, b) => a - b).map((p) => ({ value: String(p), label: `Pod ${p}` })),
  ];
  const visibleRows = podFilter ? rows.filter((r) => String(r.pod) === podFilter) : rows;

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 w-fit">
          {KINDS.map((k) => (
            <button key={k.key} onClick={() => setKind(k.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                kind === k.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'
              }`}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="w-32"><ThemedSelect value={podFilter} onChange={setPodFilter} options={podOptions} /></div>
      </div>

      {kind === 'drill' && (
        <div className="mb-4 w-48">
          <ThemedSelect value={department} onChange={setDepartment}
            options={departments.map((d) => ({ value: d.code, label: d.name }))} />
        </div>
      )}

      <div className="mb-4">
        <AlertBanner level="info">
          {kind === 'checkpoint'
            ? 'Checkpoint = written (/40) + practical (/30) + behavioural (/30). Velocity and band recompute live below.'
            : kind === 'drill'
              ? `Department drill for ${deptName(department)} — one mark per trainee per department, doesn't affect their overall band.`
              : 'Gateway — the Month 5 pass/continue assessment.'}
        </AlertBanner>
      </div>

      <div className="flex justify-end items-center gap-3 mb-3">
        {saved && <span className="text-xs text-gray-500 dark:text-gray-400">Saved</span>}
        <button onClick={save} disabled={saving} className={btnPrimaryBase} style={primaryStyle(getThemeColor())}>
          {saving ? 'Saving…' : 'Save marks'}
        </button>
      </div>

      <div className="overflow-x-auto custom-horizontal-scrollbar border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
              <th className="px-3 py-2 text-left">Trainee</th>
              {kind === 'checkpoint' && <th className="px-3 py-2 text-left">Baseline</th>}
              <th className="px-3 py-2 text-left">Written /40</th>
              <th className="px-3 py-2 text-left">Practical /30</th>
              <th className="px-3 py-2 text-left">Behavioural /30</th>
              <th className="px-3 py-2 text-left">Total</th>
              {kind === 'checkpoint' && <><th className="px-3 py-2 text-left">Velocity</th><th className="px-3 py-2 text-left">Band</th></>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr><td colSpan={kind === 'checkpoint' ? 8 : 5} className="px-3 py-8 text-center text-sm text-gray-400">No trainees in this pod.</td></tr>
            )}
            {visibleRows.map((r) => {
              if (kind === 'checkpoint') {
                const chk = (r.written != null && r.practical != null && r.behavioural != null)
                  ? r.written + r.practical + r.behavioural : null;
                return (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{r.name}</td>
                    <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">{r.baseline}</td>
                    <td className="px-3 py-2"><MarkInput max={MAX.written} value={r.written} onChange={(v) => setCheckpointMark(r.id, 'written', v)} /></td>
                    <td className="px-3 py-2"><MarkInput max={MAX.practical} value={r.practical} onChange={(v) => setCheckpointMark(r.id, 'practical', v)} /></td>
                    <td className="px-3 py-2"><MarkInput max={MAX.behavioural} value={r.behavioural} onChange={(v) => setCheckpointMark(r.id, 'behavioural', v)} /></td>
                    <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">{chk ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">{velocityOf(r.baseline, chk) ?? '—'}</td>
                    <td className="px-3 py-2"><BandBadge band={bandOf(r.baseline, chk)} /></td>
                  </tr>
                );
              }
              const m = marks[r.id] ?? {};
              const total = (m.written != null && m.practical != null && m.behavioural != null)
                ? m.written + m.practical + m.behavioural : null;
              return (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{r.name}</td>
                  <td className="px-3 py-2"><MarkInput max={MAX.written} value={m.written} onChange={(v) => setOtherMark(r.id, 'written', v)} /></td>
                  <td className="px-3 py-2"><MarkInput max={MAX.practical} value={m.practical} onChange={(v) => setOtherMark(r.id, 'practical', v)} /></td>
                  <td className="px-3 py-2"><MarkInput max={MAX.behavioural} value={m.behavioural} onChange={(v) => setOtherMark(r.id, 'behavioural', v)} /></td>
                  <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">{total ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
