import { ChevronDown, Plus, Trash2, Users2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { btn } from '../ui/classes';
import { confirmDelete } from '../ui/confirm';
import ThemedSelect from './theme/ThemedSelect';

// Pod → buddy assignment, plus adding/removing pods themselves. Reassigning a buddy
// cascades to every trainee currently in that pod server-side (Trainee.buddy is a
// snapshot, not a live join) — see backend/src/routes/pods.js.
export default function PodBuddyPanel() {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [pods, setPods] = useState(null);
  const [buddies, setBuddies] = useState(null);
  const [saving, setSaving] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const canDelete = can('trainees', 'delete');

  function reload() {
    Promise.all([api.get('/pods'), api.get('/users')]).then(([p, users]) => {
      setPods(p);
      setBuddies(users.filter((u) => u.role === 'buddy' && u.active));
    }).catch((e) => setError(e.message));
  }
  useEffect(reload, []);

  async function assign(podId, buddyId) {
    setSaving(podId);
    setError(null);
    try {
      await api.put(`/pods/${podId}`, { buddyId });
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  async function addPod() {
    setAdding(true);
    setError(null);
    try {
      await api.post('/pods', {});
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function removePod(p) {
    if (!(await confirmDelete(p.name))) return;
    setError(null);
    try {
      await api.delete(`/pods/${p.id}`);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <Users2 className="w-4 h-4 text-gray-400" />
        <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">Pod buddies</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4">
          {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
          {!pods || !buddies ? (
            <div className="text-sm text-gray-400">Loading…</div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {pods.map((p) => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{p.name}</span>
                      {canDelete && (
                        <button onClick={() => removePod(p)} title="Delete pod"
                          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <ThemedSelect value={p.buddyId} onChange={(v) => assign(p.id, v)}
                      placeholder={saving === p.id ? 'Saving…' : 'Choose a buddy'}
                      options={buddies.map((b) => ({ value: b.id, label: b.name }))} />
                  </div>
                ))}
              </div>
              <button onClick={addPod} disabled={adding} className={`${btn.secondary} flex items-center gap-1.5 text-xs mt-3`}>
                <Plus className="w-3.5 h-3.5" /> {adding ? 'Adding…' : 'Add pod'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
