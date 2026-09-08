import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { api } from '../api/client';
import AlertBanner from '../components/AlertBanner';
import DailyLogBody from '../components/DailyLogBody';
import ThemedSelect from '../components/theme/ThemedSelect';
import { useTheme } from '../context/ThemeContext';
import { btnPrimaryBase, inputClass, insetPanel, primaryStyle } from '../ui/classes';

const BATCH_ID = 'b1';
const ATT_CODES = ['P', 'A', 'L', 'H'];
const ATT_ON_CLASS = {
  P: 'bg-green-600 border-green-600 text-white',
  A: 'bg-red-600 border-red-600 text-white',
  L: 'bg-amber-500 border-amber-500 text-white',
  H: 'bg-slate-500 border-slate-500 text-white',
};
const LOG_SCORES = [1, 2, 3, 4, 5];

function Chip({ active, activeClass, onClick, style, children }) {
  return (
    <button type="button" onClick={onClick} style={active ? style : undefined}
      className={`w-7 h-7 text-xs font-semibold rounded border transition-colors
        ${active ? activeClass : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400'}`}>
      {children}
    </button>
  );
}

export default function DailyEntry() {
  const { getThemeColor } = useTheme();
  const [days, setDays] = useState(null);
  const [dayCode, setDayCode] = useState(null);
  const [rows, setRows] = useState(null);
  const [podFilter, setPodFilter] = useState('');
  const [expanded, setExpanded] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/batches/${BATCH_ID}/days`).then((d) => {
      setDays(d);
      // Default to today's actual date, not just the last day in the list — the
      // backend guarantees today's day exists (batches.js's ensureTodayDay), so this
      // should always find a match; the fallback is defensive only.
      const todayStr = new Date().toISOString().slice(0, 10);
      setDayCode((d.find((day) => day.date === todayStr) ?? d[d.length - 1]).code);
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!dayCode) return;
    setRows(null);
    api.get(`/batches/${BATCH_ID}/days/${dayCode}`)
      .then((data) => setRows(data.rows))
      .catch((e) => setError(e.message));
  }, [dayCode]);

  const day = days?.find((d) => d.code === dayCode);

  function setAtt(traineeId, status) {
    setRows((rs) => rs.map((r) => r.trainee_id === traineeId
      ? { ...r, attendance: r.attendance === status ? null : status }
      : r));
    setSaved(false);
  }

  function toggleExpand(traineeId) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(traineeId)) next.delete(traineeId); else next.add(traineeId);
      return next;
    });
  }

  function setLog(traineeId, score) {
    setRows((rs) => rs.map((r) => r.trainee_id === traineeId
      ? { ...r, log_score: r.log_score === score ? null : score }
      : r));
    setSaved(false);
  }

  async function save() {
    if (!day) return;
    setSaving(true);
    setError(null);
    try {
      await api.put('/attendance/bulk', rows
        .filter((r) => r.attendance)
        .map((r) => ({ trainee_id: r.trainee_id, day_id: day.id, status: r.attendance })));
      await api.put('/logs/bulk', rows
        .filter((r) => r.log_score)
        .map((r) => ({ trainee_id: r.trainee_id, day_id: day.id, score: r.log_score, note: r.log_note })));
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <AlertBanner level="crit">{error}</AlertBanner>;
  if (!days || !rows) return <div className="text-sm text-gray-400">Loading…</div>;

  const done = rows.filter((r) => r.attendance && r.log_score).length;
  const podOptions = [
    { value: '', label: 'All pods' },
    ...[...new Set(rows.map((r) => r.pod))].sort((a, b) => a - b).map((p) => ({ value: String(p), label: `Pod ${p}` })),
  ];
  const visibleRows = podFilter ? rows.filter((r) => String(r.pod) === podFilter) : rows;

  return (
    <div>
      <div className="flex items-center gap-4 flex-wrap mb-4">
        <div className="w-56">
          <ThemedSelect value={dayCode} onChange={setDayCode}
            options={days.map((d) => ({ value: d.code, label: `${d.code} · ${d.label}` }))} />
        </div>
        <div className="w-32">
          <ThemedSelect value={podFilter} onChange={setPodFilter} options={podOptions} />
        </div>
        <div className="w-36 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${(done / rows.length) * 100}%`, backgroundColor: getThemeColor() }} />
        </div>
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{done} of {rows.length} complete</span>
        <div className="flex-1" />
        {saved && <span className="text-xs text-gray-500 dark:text-gray-400">Saved</span>}
        <button onClick={save} disabled={saving} className={btnPrimaryBase} style={primaryStyle(getThemeColor())}>
          {saving ? 'Saving…' : 'Save day'}
        </button>
      </div>

      <div className="overflow-x-auto custom-horizontal-scrollbar border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
              <th className="px-3 py-2 text-left w-10"></th>
              <th className="px-3 py-2 text-left">Trainee</th>
              <th className="px-3 py-2 text-left hidden sm:table-cell">Pod</th>
              <th className="px-3 py-2 text-left">Attendance</th>
              <th className="px-3 py-2 text-left">Log quality</th>
              <th className="px-3 py-2 text-left hidden md:table-cell">Note</th>
              <th className="px-3 py-2 text-left">Write-up</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">No trainees in this pod.</td></tr>
            )}
            {visibleRows.map((r) => (
              <Fragment key={r.trainee_id}>
                <tr className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <td className="px-3 py-2 text-xs font-mono text-gray-400">{r.trainee_id}</td>
                  <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{r.name}</td>
                  <td className="px-3 py-2 text-xs font-mono text-gray-400 hidden sm:table-cell">P{r.pod}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {ATT_CODES.map((a) => (
                        <Chip key={a} active={r.attendance === a} activeClass={ATT_ON_CLASS[a]} onClick={() => setAtt(r.trainee_id, a)}>{a}</Chip>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {LOG_SCORES.map((n) => (
                        <Chip key={n} active={r.log_score === n}
                          activeClass="text-white border-transparent" onClick={() => setLog(r.trainee_id, n)}
                          style={r.log_score === n ? { backgroundColor: getThemeColor() } : undefined}>
                          {n}
                        </Chip>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <input className={inputClass()} style={{ minWidth: 150 }}
                      value={r.log_note ?? ''}
                      onChange={(e) => {
                        const note = e.target.value;
                        setRows((rs) => rs.map((x) => x.trainee_id === r.trainee_id ? { ...x, log_note: note } : x));
                        setSaved(false);
                      }} />
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => toggleExpand(r.trainee_id)}
                      disabled={!r.log_body}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                      {expanded.has(r.trainee_id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      {r.log_body ? 'View' : 'None'}
                    </button>
                  </td>
                </tr>
                {expanded.has(r.trainee_id) && r.log_body && (
                  <tr className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td colSpan={7} className="px-3 pb-3">
                      <div className={insetPanel}>
                        <DailyLogBody body={r.log_body} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
