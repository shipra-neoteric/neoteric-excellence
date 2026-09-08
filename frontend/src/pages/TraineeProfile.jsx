import { ArrowLeft, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import AlertBanner from '../components/AlertBanner';
import DailyLogBody from '../components/DailyLogBody';
import {
  ATTENDANCE_BADGE, ATTENDANCE_NAME, Badge, BandBadge, DeptBadge, STATUS_BADGE, STATUS_LABEL,
} from '../components/StatusBadge';
import TraineeDrawer from '../components/TraineeDrawer';
import { btn, card, insetPanel, microLabel } from '../ui/classes';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'logs', label: 'Daily logs' },
  { key: 'checklist', label: 'Checklist', perm: ['checklist', 'view'] },
  { key: 'assessments', label: 'Assessments', perm: ['assessment', 'view'] },
  { key: 'ratings', label: 'Buddy ratings', perm: ['buddyRating', 'view'] },
  { key: 'videos', label: 'Videos', perm: ['content', 'view'] },
];

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString() : '—';
}

function OverviewTab({ detail }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className={card}>
        <div className={microLabel}>Checkpoint</div>
        <div className="text-2xl font-black text-gray-900 dark:text-white">{detail.checkpoint ?? '—'}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {detail.checkpoint != null ? `W ${detail.written} + P ${detail.practical} + B ${detail.behavioural}` : 'Not yet assessed'}
        </div>
      </div>
      <div className={card}>
        <div className={microLabel}>Velocity</div>
        <div className="text-2xl font-black text-gray-900 dark:text-white">{detail.velocity ?? '—'}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{detail.baseline ?? '—'} → {detail.checkpoint ?? '?'} / 100</div>
      </div>
      <div className={card}>
        <div className={microLabel}>Attendance</div>
        <div className="text-2xl font-black text-gray-900 dark:text-white">{detail.att_pct != null ? `${Math.round(detail.att_pct * 100)}%` : '—'}</div>
      </div>
      <div className={card}>
        <div className={microLabel}>Log average</div>
        <div className="text-2xl font-black text-gray-900 dark:text-white">{detail.log_avg != null ? detail.log_avg.toFixed(2) : '—'}</div>
      </div>
    </div>
  );
}

// One card per day — attendance, log score and the write-up all live together, so
// there's never any doubt about which day a given write-up belongs to (previously a
// wide table separated them, and most cells had no explicit text color at all, which
// made them read as blank).
function LogsTab({ history }) {
  const [openDay, setOpenDay] = useState(null);
  if (!history?.length) return <div className="text-sm text-gray-400">No days recorded yet.</div>;
  return (
    <div className="space-y-2">
      {history.map((h) => {
        const open = openDay === h.code;
        const hasWriteup = !!h.log_body;
        return (
          <div key={h.code} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-2.5 px-3.5 py-3 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">{h.code} · {h.label}</span>
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                {h.attendance
                  ? <Badge className={ATTENDANCE_BADGE[h.attendance]}>{ATTENDANCE_NAME[h.attendance]}</Badge>
                  : <span className="text-xs text-gray-400">Attendance not marked</span>}
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  {h.log_score ? `Log score ${h.log_score}/5` : 'Not scored yet'}
                </span>
              </div>
            </div>
            {h.log_note && (
              <div className="px-3.5 pb-2 text-xs text-gray-500 dark:text-gray-400">Staff note: {h.log_note}</div>
            )}
            <div className="px-3.5 pb-3">
              {hasWriteup ? (
                <button type="button" onClick={() => setOpenDay(open ? null : h.code)}
                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline">
                  {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  {open ? 'Hide' : 'Read'} what they wrote for {h.code}
                </button>
              ) : (
                <span className="text-xs text-gray-400">No write-up submitted for this day</span>
              )}
              {open && hasWriteup && (
                <div className={`${insetPanel} mt-2`}><DailyLogBody body={h.log_body} /></div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChecklistTab({ items, onSign, canSign }) {
  if (!items) return <div className="text-sm text-gray-400">Loading…</div>;
  const doneCount = items.filter((i) => i.done).length;
  return (
    <div>
      <div className="text-xs text-gray-400 mb-3">{doneCount} of {items.length} signed off</div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.index} className={`${insetPanel} flex items-start gap-3`}>
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${item.done ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>{item.text}</div>
              {item.done && <div className="text-xs text-gray-400 mt-0.5">Signed by {item.signedBy} · {fmtDate(item.signedAt)}</div>}
            </div>
            {item.evidenceUrl && (
              <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="flex-shrink-0">
                <img src={item.evidenceUrl} alt="" className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-700" />
              </a>
            )}
            {!item.done && item.evidenceUrl && canSign && (
              <button onClick={() => onSign(item.index)} className={`${btn.secondary} !px-2.5 !py-1 text-xs flex-shrink-0`}>Sign off</button>
            )}
            {!item.done && !item.evidenceUrl && <span className="text-xs text-gray-400 flex-shrink-0 mt-1">Not started</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AssessmentsTab({ records, baseline }) {
  if (!records) return <div className="text-sm text-gray-400">Loading…</div>;
  const checkpoint = records.find((r) => r.kind === 'checkpoint');
  const gateway = records.find((r) => r.kind === 'gateway');
  const drills = records.filter((r) => r.kind === 'drill');

  if (baseline == null && !checkpoint && !gateway && drills.length === 0) {
    return <div className="text-sm text-gray-400">No assessments recorded yet.</div>;
  }

  return (
    <div className="space-y-3">
      {baseline != null && (
        <div className={insetPanel}>
          <div className={microLabel}>Baseline (D01)</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{baseline} / 100</div>
        </div>
      )}
      {[checkpoint && { ...checkpoint, label: 'Checkpoint' }, gateway && { ...gateway, label: 'Gateway' }].filter(Boolean).map((r) => (
        <div key={r.kind} className={insetPanel}>
          <div className={microLabel}>{r.label}</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{r.total ?? '—'} / 100</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Written {r.written} · Practical {r.practical} · Behavioural {r.behavioural} — {r.assessedBy ?? '—'} on {fmtDate(r.assessedAt)}
          </div>
        </div>
      ))}
      {drills.length > 0 && (
        <div>
          <div className={microLabel}>Department drills</div>
          <div className="grid sm:grid-cols-2 gap-2 mt-1.5">
            {drills.map((r) => (
              <div key={r.department} className={insetPanel}>
                <div className="mb-1"><DeptBadge department={r.department} /></div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">{r.total ?? '—'} / 100</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Written {r.written} · Practical {r.practical} · Behavioural {r.behavioural}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RatingsTab({ ratings }) {
  if (!ratings) return <div className="text-sm text-gray-400">Loading…</div>;
  if (!ratings.length) return <div className="text-sm text-gray-400">No weekly ratings submitted yet.</div>;
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
            <th className="px-3 py-2 text-left">Week of</th>
            <th className="px-3 py-2 text-left">Score</th>
            <th className="px-3 py-2 text-left hidden sm:table-cell">Note</th>
            <th className="px-3 py-2 text-left">By</th>
          </tr>
        </thead>
        <tbody>
          {[...ratings].reverse().map((r) => (
            <tr key={r.weekStart} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
              <td className="px-3 py-2 text-gray-900 dark:text-white">{r.weekStart}</td>
              <td className="px-3 py-2 font-mono text-gray-900 dark:text-white">{r.score} / 5</td>
              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{r.note || '—'}</td>
              <td className="px-3 py-2 text-xs text-gray-400">{r.submittedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// A % progress bar looked empty for almost every real video here, since duration is
// only known when a YouTube Data API key is configured (services/youtube.js) — with
// no duration, `pct` is null and the bar just rendered as an invisible 0%-wide sliver.
// Replaced with a plain status badge that never depends on knowing the duration.
function watchedStatus(v) {
  if (v.flaggedForSkipping) return { label: 'Skipped ahead — not counted', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
  if (v.completedAt) return { label: 'Watched', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
  if (v.secondsWatched > 0) return { label: 'Started, not finished', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
  return { label: 'Not watched yet', className: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' };
}

function formatWatched(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s} sec`;
  return s === 0 ? `${m} min` : `${m} min ${s} sec`;
}

function VideosTab({ videos, onReset, canReset }) {
  if (!videos) return <div className="text-sm text-gray-400">Loading…</div>;
  if (!videos.length) return <div className="text-sm text-gray-400">No videos assigned yet.</div>;
  return (
    <div className="space-y-2">
      {videos.map((v) => {
        const status = watchedStatus(v);
        const watchedText = formatWatched(v.secondsWatched);
        return (
          <div key={v.videoId} className={insetPanel}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{v.title}</div>
                <div className="text-xs text-gray-400">{v.channel}</div>
              </div>
              <Badge className={status.className}>{status.label}</Badge>
              {v.flaggedForSkipping && canReset && (
                <button onClick={() => onReset(v.videoId)} className={`${btn.secondary} !px-2.5 !py-1 text-xs`}>Reset</button>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              {watchedText ? `Watched so far: ${watchedText}` : "Hasn't opened this video yet"}
              {v.completedAt && ` · Finished on ${fmtDate(v.completedAt)}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TraineeProfile() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [checklist, setChecklist] = useState(null);
  const [assessments, setAssessments] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [videos, setVideos] = useState(null);

  function reload() {
    api.get(`/trainees/${code}`).then(setDetail).catch((e) => setError(e.message));
  }
  useEffect(reload, [code]);

  useEffect(() => {
    if (tab === 'checklist' && checklist === null && can('checklist', 'view')) {
      api.get(`/checklist/${code}`).then(setChecklist).catch((e) => setError(e.message));
    } else if (tab === 'assessments' && assessments === null && can('assessment', 'view')) {
      api.get(`/assessments/${code}`).then(setAssessments).catch((e) => setError(e.message));
    } else if (tab === 'ratings' && ratings === null && can('buddyRating', 'view')) {
      api.get(`/buddy-ratings?trainee=${code}`).then(setRatings).catch((e) => setError(e.message));
    } else if (tab === 'videos' && videos === null && can('content', 'view')) {
      api.get(`/videos/progress/${code}`).then(setVideos).catch((e) => setError(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, code]);

  async function resetVideo(videoId) {
    try {
      await api.put(`/videos/progress/${code}/${videoId}/reset`, {});
      setVideos(await api.get(`/videos/progress/${code}`));
    } catch (e) {
      setError(e.message);
    }
  }

  async function signItem(index) {
    try {
      await api.put(`/checklist/${code}/${index}/sign`, {});
      setChecklist(await api.get(`/checklist/${code}`));
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <AlertBanner level="crit">{error}</AlertBanner>;
  if (!detail) return <div className="text-sm text-gray-400">Loading…</div>;

  const availableTabs = TABS.filter((t) => !t.perm || can(...t.perm));

  return (
    <div>
      <button onClick={() => navigate('/trainees')}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3">
        <ArrowLeft className="w-4 h-4" /> Back to trainees
      </button>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{detail.name}</h1>
            <span className="font-mono text-xs text-gray-400">{code}</span>
            <BandBadge band={detail.band} />
            <Badge className={STATUS_BADGE[detail.status]}>{STATUS_LABEL[detail.status] ?? detail.status}</Badge>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pod {detail.pod} · Buddy: {detail.buddy ?? '—'} · {detail.branch}
          </div>
        </div>
        {can('trainees', 'edit') && (
          <button onClick={() => setEditing(true)} className={`${btn.secondary} flex items-center gap-1.5 text-sm`}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 w-fit overflow-x-auto max-w-full">
        {availableTabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab detail={detail} />}
      {tab === 'logs' && <LogsTab history={detail.history} />}
      {tab === 'checklist' && <ChecklistTab items={checklist} onSign={signItem} canSign={can('checklist', 'edit')} />}
      {tab === 'assessments' && <AssessmentsTab records={assessments} baseline={detail.baseline} />}
      {tab === 'ratings' && <RatingsTab ratings={ratings} />}
      {tab === 'videos' && <VideosTab videos={videos} onReset={resetVideo} canReset={can('content', 'edit')} />}

      {editing && (
        <TraineeDrawer code={code} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />
      )}
    </div>
  );
}
