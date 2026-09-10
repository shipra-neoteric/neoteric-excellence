import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function toIso(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseIso(value) {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return { y, m: m - 1, d };
}

// Portal-rendered month-grid calendar dropdown — not a native <input type="date">,
// whose built-in picker icon renders per the OS/browser color-scheme rather than this
// app's manual .dark toggle, so it can end up invisible against the input's own
// background. Same trigger+portal+outside-click pattern as ThemedSelect.
export default function DatePicker({ value, onChange, placeholder = 'Not scheduled', className = '' }) {
  const { getThemeColor } = useTheme();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const today = new Date();
  const selected = parseIso(value);
  const [viewY, setViewY] = useState((selected ?? today).y ?? today.getFullYear());
  const [viewM, setViewM] = useState((selected ?? today).m ?? today.getMonth());
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  // Computed against the VISUAL viewport (window.visualViewport), not
  // window.innerHeight/innerWidth — on iOS Safari, window.innerHeight does NOT
  // shrink when the on-screen keyboard appears (only the visual viewport does), so
  // using it left the popup positioned as if the full screen were still visible,
  // landing it partly underneath the keyboard whenever a keyboard was already open
  // (e.g. from a text field elsewhere in the same form) when this was opened.
  function computeRect(triggerEl) {
    const r = triggerEl.getBoundingClientRect();
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const openUpward = vh - r.bottom < 320 && r.top > 320;
    const margin = 8;
    const width = 260;
    const left = Math.min(Math.max(r.left, margin), vw - width - margin);
    return { left, openUpward, top: r.bottom + 4, bottom: vh - r.top + 4 };
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (triggerRef.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onWindowResize() { setOpen(false); }
    function onViewportResize() {
      // The keyboard opening/closing shrinks or grows the visual viewport without
      // necessarily firing a "resize" on window (notably on iOS Safari) —
      // reposition in place instead of closing.
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
      const base = selected ?? { y: today.getFullYear(), m: today.getMonth() };
      setViewY(base.y);
      setViewM(base.m);
    }
    setOpen((o) => !o);
  }

  function shiftMonth(delta) {
    let m = viewM + delta;
    let y = viewY;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewM(m);
    setViewY(y);
  }

  function pick(day) {
    onChange(toIso(viewY, viewM, day));
    setOpen(false);
  }

  const firstWeekday = new Date(viewY, viewM, 1).getDay();
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const label = selected ? `${String(selected.d).padStart(2, '0')} ${MONTHS[selected.m].slice(0, 3)} ${selected.y}` : placeholder;

  return (
    <>
      <button type="button" ref={triggerRef} onClick={toggle}
        className={`h-8 px-2.5 flex items-center gap-1.5 border rounded-md text-xs whitespace-nowrap
          bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
          ${selected ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'} ${className}`}
        style={open ? { boxShadow: `0 0 0 2px ${getThemeColor()}` } : undefined}
      >
        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
        {label}
      </button>

      {open && rect && createPortal(
        <div ref={popupRef}
          className="fixed z-[10050] w-[260px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl p-3"
          style={{ left: rect.left, ...(rect.openUpward ? { bottom: rect.bottom } : { top: rect.top }) }}
        >
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => shiftMonth(-1)}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{MONTHS[viewM]} {viewY}</span>
            <button type="button" onClick={() => shiftMonth(1)}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const isSelected = selected && selected.y === viewY && selected.m === viewM && selected.d === day;
              const isToday = today.getFullYear() === viewY && today.getMonth() === viewM && today.getDate() === day;
              return (
                <button key={i} type="button" onClick={() => pick(day)}
                  className={`h-7 rounded text-xs flex items-center justify-center transition-colors
                    ${isSelected ? 'font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}
                    ${isToday && !isSelected ? 'ring-1 ring-inset ring-orange-400' : ''}`}
                  style={isSelected ? { backgroundColor: getThemeColor(), color: '#fff' } : undefined}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button"
              onClick={() => { onChange(toIso(today.getFullYear(), today.getMonth(), today.getDate())); setOpen(false); }}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              Today
            </button>
            {value && (
              <button type="button" onClick={() => { onChange(null); setOpen(false); }}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
