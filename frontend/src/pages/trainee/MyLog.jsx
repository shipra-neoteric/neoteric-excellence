import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import AlertBanner from '../../components/AlertBanner';
import ThemedSelect from '../../components/theme/ThemedSelect';
import { useTheme } from '../../context/ThemeContext';
import { DAILY_LOG_PROMPTS as PROMPTS } from '../../dailyLogPrompts';
import { queueLog, syncQueuedLogs } from '../../offline/logQueue';
import { btnPrimaryBase, card, microLabel, primaryStyle } from '../../ui/classes';
import { toastSuccess } from '../../ui/confirm';

const BATCH_ID = 'b1';

const emptyForm = Object.fromEntries(PROMPTS.map((p) => [p.key, '']));

async function postLog(dayId, bodyJson) {
  await api.post('/logs', { day_id: dayId, bodyJson });
}

export default function MyLog() {
  const { getThemeColor } = useTheme();
  const [days, setDays] = useState(null);
  const [dayCode, setDayCode] = useState(null);
  const [history, setHistory] = useState(null); // this trainee's own past write-ups, by day code
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // null | 'saved' | 'queued'
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.get(`/batches/${BATCH_ID}/days`), api.get('/trainees/me')]).then(([d, me]) => {
      setDays(d);
      setHistory(me.history);
      // Default to today's actual date — not the last day in the list, which used to
      // silently be several days in the future (see batches.js's ensureTodayDay).
      const todayStr = new Date().toISOString().slice(0, 10);
      setDayCode((d.find((day) => day.date === todayStr) ?? d[d.length - 1]).code);
    }).catch((e) => setError(e.message));

    const flush = () => syncQueuedLogs(postLog);
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);

  // Picking any day — today or a back date — loads whatever this trainee already
  // wrote for it, so they can see (and, same as before, still update) a past entry
  // instead of always facing a blank form.
  useEffect(() => {
    if (!dayCode || !history) return;
    setForm(history.find((h) => h.code === dayCode)?.log_body ?? emptyForm);
    setStatus(null);
  }, [dayCode, history]);

  const day = days?.find((d) => d.code === dayCode);
  const alreadySubmitted = !!history?.find((h) => h.code === dayCode)?.log_body;

  async function save() {
    if (!day) return;
    setSaving(true);
    setError(null);
    let succeeded = true;
    try {
      await postLog(day.id, form);
      setStatus('saved');
      toastSuccess(alreadySubmitted ? 'Log updated!' : 'Log submitted!');
    } catch (e) {
      // Network failure (offline) vs. a real server error (e.g. session expired):
      // only queue the former — a real error should surface, not silently disappear.
      const offline = !navigator.onLine || e instanceof TypeError;
      if (offline) {
        await queueLog(day.id, form);
        setStatus('queued');
      } else {
        setError(e.message);
        succeeded = false;
      }
    } finally {
      setSaving(false);
    }
    if (succeeded) {
      setHistory((h) => h?.map((entry) => (entry.code === dayCode ? { ...entry, log_body: form } : entry)));
    }
  }

  if (error) return <AlertBanner level="crit">{error}</AlertBanner>;
  if (!days) return <div className="text-sm text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="mb-4">
        <ThemedSelect value={dayCode} onChange={setDayCode}
          options={days.map((d) => ({ value: d.code, label: `${d.code} · ${d.label}` }))} />
      </div>

      {alreadySubmitted && (
        <div className="mb-4">
          <AlertBanner level="info">You already submitted a log for this day — shown below. Change anything and submit again to update it.</AlertBanner>
        </div>
      )}

      <div className="space-y-3">
        {PROMPTS.map((p) => (
          <div key={p.key} className={card}>
            <div className={microLabel}>{p.label}</div>
            <textarea rows={2}
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              value={form[p.key]}
              onChange={(e) => { setForm((f) => ({ ...f, [p.key]: e.target.value })); setStatus(null); }} />
          </div>
        ))}
      </div>

      <div className="mt-3 mb-3 space-y-2">
        {status === 'saved' && <div className="text-xs text-gray-500 dark:text-gray-400">Saved — queued for your coordinator to score.</div>}
        {status === 'queued' && (
          <AlertBanner level="warn">No connection — saved on your phone. It'll send automatically once you're back online.</AlertBanner>
        )}
      </div>
      <button onClick={save} disabled={saving} className={`w-full ${btnPrimaryBase}`} style={primaryStyle(getThemeColor())}>
        {saving ? 'Saving…' : 'Submit log'}
      </button>
    </div>
  );
}
