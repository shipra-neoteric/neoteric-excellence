import { Camera, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { api } from '../../api/client';
import AlertBanner from '../../components/AlertBanner';
import { useTheme } from '../../context/ThemeContext';
import { btn } from '../../ui/classes';
import { fileToDataUrl } from '../../ui/file';

export default function MyChecklist() {
  const { getThemeColor } = useTheme();
  const { checklistEnabled } = useOutletContext();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  function reload() {
    api.get('/checklist/me').then(setItems).catch((e) => setError(e.message));
  }
  useEffect(reload, []);

  async function handleFile(index, file) {
    if (!file) return;
    setUploadingIndex(index);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      await api.post(`/checklist/${index}/evidence`, { dataUrl });
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingIndex(null);
    }
  }

  if (!checklistEnabled) return <Navigate to="/t/today" replace />;
  if (error) return <AlertBanner level="crit">{error}</AlertBanner>;
  if (!items) return <div className="text-sm text-gray-400">Loading…</div>;

  const done = items.filter((i) => i.done).length;

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${(done / items.length) * 100}%`, backgroundColor: getThemeColor() }} />
        </div>
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{done}/{items.length}</span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Add a photo before your buddy or coordinator can sign an item off.
      </p>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex gap-2.5 items-start">
              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                item.done ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'border border-gray-300 dark:border-gray-600'
              }`}>
                {item.done && <Check className="w-3 h-3" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${item.done ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{item.text}</div>
                {item.evidenceUrl && (
                  <img src={item.evidenceUrl} alt="" className="w-16 h-16 object-cover rounded mt-1.5" />
                )}
                {item.done && <div className="text-xs text-gray-400 mt-1">Signed by {item.signedBy}</div>}
              </div>
              {!item.done && (
                <label className={`${btn.secondary} flex items-center gap-1.5 !px-2.5 !py-1.5 text-xs cursor-pointer flex-shrink-0`}>
                  <Camera className="w-3.5 h-3.5" />
                  {uploadingIndex === item.index ? '…' : (item.evidenceUrl ? 'Retake' : 'Add photo')}
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => handleFile(item.index, e.target.files?.[0])} />
                </label>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
