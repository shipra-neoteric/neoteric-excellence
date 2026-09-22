import { Pencil, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import AlertBanner from '../components/AlertBanner';
import PodBuddyPanel from '../components/PodBuddyPanel';
import { Badge, BAND_NAME, BandBadge, DeptBadge, STATUS_BADGE, STATUS_LABEL } from '../components/StatusBadge';
import ThemedSelect from '../components/theme/ThemedSelect';
import TraineeDrawer from '../components/TraineeDrawer';
import { useTheme } from '../context/ThemeContext';
import { btn, btnPrimaryBase, inputClass, primaryStyle } from '../ui/classes';

const BAND_OPTIONS = [
  { value: '', label: 'All bands' },
  ...['A', 'B', 'C', 'D'].map((b) => ({ value: b, label: `${b} · ${BAND_NAME[b]}` })),
  { value: 'pending', label: 'Pending' },
];
const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))];

export default function Trainees() {
  const { getThemeColor } = useTheme();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [trainees, setTrainees] = useState(null);
  const [error, setError] = useState(null);
  const [openCode, setOpenCode] = useState(undefined); // undefined = closed, null = create, "T01" = view/edit
  const [query, setQuery] = useState('');
  const [podFilter, setPodFilter] = useState('');
  const [bandFilter, setBandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  function reload() {
    api.get('/trainees').then(setTrainees).catch((e) => setError(e.message));
  }

  useEffect(reload, []);

  function closeDrawer() {
    setOpenCode(undefined);
  }
  function onSaved() {
    closeDrawer();
    reload();
  }

  if (error) return <AlertBanner level="crit">{error}</AlertBanner>;
  if (!trainees) return <div className="text-sm text-gray-400">Loading…</div>;

  const podOptions = [
    { value: '', label: 'All pods' },
    ...[...new Set(trainees.map((t) => t.pod))].sort((a, b) => a - b).map((p) => ({ value: String(p), label: `Pod ${p}` })),
  ];
  const filtered = trainees.filter((t) => {
    if (query && !`${t.name} ${t.branch ?? ''}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (podFilter && String(t.pod) !== podFilter) return false;
    if (bandFilter && (t.band ?? 'pending') !== bandFilter) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });
  const filtersActive = query || podFilter || bandFilter || statusFilter;

  return (
    <div>
      {can('trainees', 'edit') && <PodBuddyPanel />}

      <div className="flex justify-end mb-3">
        <button onClick={() => setOpenCode(null)} className={`flex items-center gap-1.5 ${btnPrimaryBase}`} style={primaryStyle(getThemeColor())}>
          <Plus className="w-4 h-4" /> Add trainee
        </button>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${inputClass()} pl-9`} placeholder="Search name or branch…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="w-32"><ThemedSelect value={podFilter} onChange={setPodFilter} options={podOptions} /></div>
        <div className="w-40"><ThemedSelect value={bandFilter} onChange={setBandFilter} options={BAND_OPTIONS} /></div>
        <div className="w-44"><ThemedSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} /></div>
        {filtersActive && (
          <button onClick={() => { setQuery(''); setPodFilter(''); setBandFilter(''); setStatusFilter(''); }}
            className={`${btn.secondary} text-xs !px-2.5 !py-1.5`}>
            Clear
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {trainees.length}</span>
      </div>

      <div className="overflow-x-auto custom-horizontal-scrollbar border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-2.5 text-left">Trainee</th>
              <th className="px-4 py-2.5 text-left hidden sm:table-cell">Pod</th>
              <th className="px-4 py-2.5 text-left hidden sm:table-cell">Department</th>
              <th className="px-4 py-2.5 text-left">Band</th>
              <th className="px-4 py-2.5 text-left hidden lg:table-cell">Status</th>
              <th className="px-4 py-2.5 text-left hidden md:table-cell">Velocity</th>
              <th className="px-4 py-2.5 text-left hidden md:table-cell">Log avg</th>
              <th className="px-4 py-2.5 text-left hidden lg:table-cell">Attend</th>
              <th className="px-4 py-2.5 text-left w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                {trainees.length === 0 ? 'No trainees yet.' : 'No trainees match these filters.'}
              </td></tr>
            )}
            {filtered.map((t) => (
              <tr key={t.id} onClick={() => navigate(`/trainees/${t.id}`)}
                className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900 dark:text-white">{t.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t.branch}</div>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-gray-400 hidden sm:table-cell">P{t.pod}</td>
                <td className="px-4 py-3 hidden sm:table-cell">{t.department ? <DeptBadge department={t.department} /> : <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3"><BandBadge band={t.band} /></td>
                <td className="px-4 py-3 hidden lg:table-cell"><Badge className={STATUS_BADGE[t.status]}>{STATUS_LABEL[t.status] ?? t.status}</Badge></td>
                <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-200 hidden md:table-cell">{t.velocity ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-200 hidden md:table-cell">{t.log_avg != null ? t.log_avg.toFixed(2) : '—'}</td>
                <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-200 hidden lg:table-cell">{t.att_pct != null ? `${Math.round(t.att_pct * 100)}%` : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={(e) => { e.stopPropagation(); setOpenCode(t.id); }} title="Quick edit"
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openCode !== undefined && (
        <TraineeDrawer code={openCode} onClose={closeDrawer} onSaved={onSaved} />
      )}
    </div>
  );
}
