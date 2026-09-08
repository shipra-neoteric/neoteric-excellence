// Semantic status color maps, adapted from the style guide's STATUS_BADGE pattern to
// NEEV's own domain values. Reuse these exact maps for any new badge — don't invent
// new colors per screen.

export const BAND_BADGE = {
  A: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  C: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  D: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};
export const BAND_NAME = { A: 'Fast', B: 'On track', C: 'Developing', D: 'At risk' };
export const BAND_DOT = { A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-amber-500', D: 'bg-red-500' };

export const ATTENDANCE_BADGE = {
  P: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  A: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  L: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  H: 'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
};
export const ATTENDANCE_NAME = { P: 'Present', A: 'Absent', L: 'Late', H: 'Holiday' };

export const VIDEO_STATUS_BADGE = {
  suggested: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  linked: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  retired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export const STATUS_BADGE = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  exited: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  gateway_passed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};
export const STATUS_LABEL = { active: 'Active', exited: 'Exited', gateway_passed: 'Gateway passed', confirmed: 'Confirmed' };

export const DEPT_BADGE = {
  SUP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  QC: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  MEA: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  STR: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};
export const DEPT_NAME = { SUP: 'Supervision', QC: 'Quality', MEA: 'Measurement', STR: 'Store' };

export function Badge({ className, children }) {
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>{children}</span>;
}

export function BandBadge({ band }) {
  if (!band) return <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Pending</Badge>;
  return (
    <Badge className={BAND_BADGE[band]}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${BAND_DOT[band]}`} />
      {band} · {BAND_NAME[band]}
    </Badge>
  );
}

export function DeptBadge({ department }) {
  return <Badge className={DEPT_BADGE[department]}>{DEPT_NAME[department]}</Badge>;
}
