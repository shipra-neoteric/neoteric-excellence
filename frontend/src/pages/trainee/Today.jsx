import { ChevronRight, FileText, Image as ImageIcon, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import AlertBanner from '../../components/AlertBanner';
import { DeptBadge } from '../../components/StatusBadge';
import YouTubePlayer from '../../components/YouTubePlayer';
import { insetPanel } from '../../ui/classes';

function fileIcon(fileType, fileName) {
  const ext = (fileName ?? '').split('.').pop()?.toLowerCase();
  if (fileType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return ImageIcon;
  return FileText;
}

export default function Today() {
  const [modules, setModules] = useState(null);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [openModule, setOpenModule] = useState(null);

  useEffect(() => {
    api.get('/modules?with=videos').then(setModules).catch((e) => setError(e.message));
  }, []);

  if (error) return <AlertBanner level="crit">{error}</AlertBanner>;
  if (!modules) return <div className="text-sm text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="space-y-2">
        {modules.map((m) => {
          const open = openModule === m._id;
          return (
            <div key={m._id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button onClick={() => setOpenModule(open ? null : m._id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
                <span className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">{m.code}</span>
                <span className="flex-1 font-semibold text-gray-900 dark:text-white">{m.title}</span>
                <DeptBadge department={m.department} />
              </button>
              {open && (
                <div className="px-4 pb-4">
                  {m.notes?.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {m.notes.map((n) => {
                        const Icon = n.fileUrl ? fileIcon(n.fileType, n.fileName) : FileText;
                        return (
                          <a key={n._id} href={n.fileUrl} target={n.fileUrl ? '_blank' : undefined} rel="noreferrer"
                            className={`${insetPanel} flex items-start gap-2.5 ${n.fileUrl ? 'hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer' : ''}`}>
                            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</div>
                              {n.fileName && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.fileName}</div>}
                              {!n.fileUrl && n.body && <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{n.body}</div>}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                  {m.videos.filter((v) => v.status === 'linked').length === 0
                    ? (m.notes?.length ?? 0) === 0 && <div className="text-sm text-gray-400">No content yet.</div>
                    : (
                      <div className="grid grid-cols-2 gap-3">
                        {m.videos.filter((v) => v.status === 'linked').map((v) => (
                          <div key={v._id} onClick={() => setPlaying(v)}
                            className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden cursor-pointer">
                            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                              <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center">
                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                              </div>
                            </div>
                            <div className="p-2">
                              <div className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2">{v.title ?? v.youtubeId}</div>
                              <div className="text-[11px] text-gray-400">{v.channel}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {playing && <YouTubePlayer video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
