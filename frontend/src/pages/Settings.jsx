import { useEffect, useState } from 'react';
import { api } from '../api/client';
import AlertBanner from '../components/AlertBanner';
import { useTheme } from '../context/ThemeContext';
import { card } from '../ui/classes';

export default function Settings() {
  const { getThemeColor } = useTheme();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function reload() {
    api.get('/settings').then(setSettings).catch((e) => setError(e.message));
  }
  useEffect(reload, []);

  async function toggleChecklist() {
    setSaving(true);
    setError(null);
    try {
      setSettings(await api.put('/settings', { traineeChecklistEnabled: !settings.traineeChecklistEnabled }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <AlertBanner level="crit">{error}</AlertBanner>;
  if (!settings) return <div className="text-sm text-gray-400">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Trainee checklist</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Show the Checklist tab on the trainee app. Turning this off just hides the
              tab and blocks the page — nothing already recorded (photos, sign-offs) is
              deleted, and turning it back on brings it all back.
            </div>
          </div>
          <button onClick={toggleChecklist} disabled={saving}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
            style={{ backgroundColor: settings.traineeChecklistEnabled ? getThemeColor() : '#d1d5db' }}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${settings.traineeChecklistEnabled ? 'translate-x-[18px]' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
