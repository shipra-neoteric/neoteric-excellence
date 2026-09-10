import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext';

// Custom select — never a native <select> (style guide §11). Portal-rendered so the
// popup never gets clipped by a scrollable ancestor (e.g. a table wrapper), and
// auto-flips upward if there isn't 250px below the trigger.
export default function ThemedSelect({ value, onChange, options, placeholder = 'Select…', alwaysShowSearch = false }) {
  const { getThemeColor } = useTheme();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [query, setQuery] = useState('');
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const selected = options.find((o) => o.value === value);
  const showSearch = alwaysShowSearch || options.length > 8;
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // The popup's own search input autoFocuses when it opens, which pops the mobile
  // keyboard immediately — so position must be computed against the VISUAL viewport
  // (window.visualViewport), not window.innerHeight/innerWidth. On iOS Safari in
  // particular, window.innerHeight does NOT shrink when the keyboard appears (only
  // the visual viewport does), so using it here left the popup positioned as if the
  // full screen were still visible, landing part of it underneath the keyboard.
  function computeRect(triggerEl) {
    const r = triggerEl.getBoundingClientRect();
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const openUpward = vh - r.bottom < 250 && r.top > 250;
    const margin = 8;
    const width = Math.min(Math.max(r.width, 180), vw - margin * 2);
    const left = Math.min(Math.max(r.left, margin), vw - width - margin);
    return { left, width, openUpward, top: r.bottom + 4, bottom: vh - r.top + 4 };
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (triggerRef.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onWindowResize() {
      setOpen(false); // cached position would otherwise go stale (e.g. orientation change)
    }
    function onViewportResize() {
      // The keyboard opening/closing shrinks or grows the visual viewport without
      // necessarily firing a "resize" on window (notably on iOS Safari) — reposition
      // in place instead of closing, since it's often this very popup's own search
      // input that just triggered the keyboard to appear.
      if (triggerRef.current) setRect(computeRect(triggerRef.current));
    }
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('resize', onWindowResize);
    window.visualViewport?.addEventListener('resize', onViewportResize);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('resize', onWindowResize);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      setRect(computeRect(triggerRef.current));
      setQuery('');
    }
    setOpen((o) => !o);
  }

  return (
    <>
      <button type="button" ref={triggerRef} onClick={toggle}
        className="w-full h-10 px-3 py-2 flex items-center justify-between gap-2 border rounded-md shadow-sm text-sm
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
        style={open ? { boxShadow: `0 0 0 2px ${getThemeColor()}` } : undefined}
      >
        <span className={selected ? '' : 'text-gray-400 dark:text-gray-500'}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && rect && createPortal(
        <div ref={popupRef}
          className="fixed z-[10050] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl overflow-hidden"
          style={{
            left: rect.left, width: Math.max(rect.width, 180),
            ...(rect.openUpward ? { bottom: rect.bottom } : { top: rect.top }),
          }}
        >
          {showSearch && (
            <div className="relative p-2 border-b border-gray-100 dark:border-gray-700">
              <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">No matches</div>}
            {filtered.map((o) => (
              <button key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left
                  text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {o.label}
                {o.value === value && <Check className="w-4 h-4" style={{ color: getThemeColor() }} />}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
