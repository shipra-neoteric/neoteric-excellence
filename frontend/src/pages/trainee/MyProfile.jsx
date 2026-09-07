import { Award, Mail, MapPin, Phone, User, Users2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import AlertBanner from '../../components/AlertBanner';
import { Badge, STATUS_BADGE, STATUS_LABEL } from '../../components/StatusBadge';
import { card } from '../../ui/classes';

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
        <div className="text-sm text-gray-900 dark:text-white truncate">{value || '—'}</div>
      </div>
    </div>
  );
}

// A basic read-only profile screen for the trainee themselves — name, contact
// details, pod/buddy, status — the kind of "who am I in this program" summary any
// LMS shows, previously nowhere in the trainee app. Reuses GET /trainees/me (already
// powers MyBand.jsx), so no new backend endpoint was needed.
export default function MyProfile() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/trainees/me').then(setMe).catch((e) => setError(e.message));
  }, []);

  if (error) return <AlertBanner level="crit">{error}</AlertBanner>;
  if (!me) return <div className="text-sm text-gray-400">Loading…</div>;

  const initials = me.name?.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-500 dark:text-gray-300 flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-gray-900 dark:text-white truncate">{me.name}</div>
          <div className="text-xs text-gray-400 font-mono">{me.id}</div>
        </div>
        <Badge className={`${STATUS_BADGE[me.status]} flex-shrink-0`}>{STATUS_LABEL[me.status] ?? me.status}</Badge>
      </div>

      <div className={card}>
        <Row icon={Phone} label="Phone" value={me.phone} />
        <Row icon={Mail} label="Email" value={me.email} />
        <Row icon={MapPin} label="Branch / college" value={me.branch} />
        <Row icon={Users2} label="Pod" value={me.pod ? `Pod ${me.pod}` : null} />
        <Row icon={User} label="Site buddy" value={me.buddy} />
        <Row icon={Award} label="Batch" value="2026-01" />
      </div>
    </div>
  );
}
