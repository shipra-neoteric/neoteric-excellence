import { ArrowLeft, Check, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import AlertBanner from '../components/AlertBanner';
import DailyLogBody from '../components/DailyLogBody';
import { Badge, BandBadge, DeptBadge, STATUS_BADGE, STATUS_LABEL } from '../components/StatusBadge';
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

function LogsTab({ history }) {
  const [openDay, setOpenDay] = useState(null);
  if (!history?.length) return <div className="text-sm text-gray-400">No days recorded yet.</div>;
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
            <th className="px-3 py-2 text-left">Day</th>
            <th className="px-3 py-2 text-left">Attendance</th>
            <th className="px-3 py-2 text-left">Log score</th>
            <th className="px-3 py-2 text-left hidden sm:table-cell">Staff note</th>
            <th className="px-3 py-2 text-left">Write-up</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => {
            const open = openDay === h.code;
            return (
              <Fragment key={h.code}>
                <tr className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">{h.code} · {h.label}</td>
                  <td className="px-3 py-2 font-mono">{h.attendance ?? '—'}</td>
                  <td className="px-3 py-2 font-mono">{h.log_score ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{h.log_note || '—'}</td>
                  <td className="px-3 py-2">
                    <button type="button" disabled={!h.log_body} onClick={() => setOpenDay(open ? null : h.code)}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                      {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      {h.log_body ? 'View' : 'None'}
                    </button>
                  </td>
                </tr>
                {open && h.log_body && (
                  <tr className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td colSpan={5} className="px-3 pb-3">
                      <div className={insetPanel}><DailyLogBody body={h.log_body} /></div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
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
              <td className="px-3 py-2">{r.weekStart}</td>
              <td className="px-3 py-2 font-mono">{r.score} / 5</td>
              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{r.note || '—'}</td>
              <td className="px-3 py-2 text-xs text-gray-400">{r.submittedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VideosTab({ videos, onReset, canReset }) {
  if (!videos) return <div className="text-sm text-gray-400">Loading…</div>;
  if (!videos.length) return <div className="text-sm text-gray-400">No videos watched yet.</div>;
  return (
    <div className="space-y-2">
      {videos.map((v) => (
        <div key={v.videoId} className={`${insetPanel} flex items-center gap-3`}>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{v.title}</div>
            <div className="text-xs text-gray-400">{v.channel}</div>
            {v.flaggedForSkipping && (
              <div className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5">Skipped ahead — not counted as watched</div>
            )}
          </div>
          <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
            <div className={`h-full ${v.flaggedForSkipping ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${v.pct ?? 0}%` }} />
          </div>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-10 text-right flex-shrink-0">{v.pct != null ? `${v.pct}%` : '—'}</span>
          {v.completedAt && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
          {v.flaggedForSkipping && canReset && (
            <button onClick={() => onReset(v.videoId)} className={`${btn.secondary} !px-2.5 !py-1 text-xs flex-shrink-0`}>Reset</button>
          )}
        </div>
      ))}
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
