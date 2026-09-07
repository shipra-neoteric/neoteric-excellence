import {
  Award, CheckSquare, ClipboardCheck, FileText, LayoutDashboard,
  ListChecks, PlayCircle, RefreshCw, Settings as SettingsIcon, ShieldCheck, Star, Users,
} from 'lucide-react';

// Nav visibility per staff role (SPEC.md §4), keyed by the role string the
// backend's JWT actually carries (Person.role — see backend/src/models/Person.js).
// `title` is generic (not tied to a specific person) — the topbar shows the real
// logged-in name from the session next to it.

export const ROLES = {
  admin: {
    title: 'Administrator',
    note: 'Full access to everything, including user management and permissions.',
    nav: ['dashboard', 'daily', 'trainees', 'assessment', 'modules', 'rotation', 'buddyRating', 'reports', 'users', 'settings'],
  },
  supervisor: {
    title: 'Training Supervisor',
    note: 'Owner. Full access: assessments, bands, department allotment, and the Saturday review pack.',
    nav: ['dashboard', 'daily', 'trainees', 'assessment', 'modules', 'rotation', 'reports'],
  },
  coordinator: {
    title: 'Training Coordinator',
    note: 'Runs it. Daily entry and trainee records. Cannot set bands or allot departments.',
    nav: ['dashboard', 'daily', 'trainees', 'modules', 'rotation', 'reports'],
  },
  office: {
    title: 'Office Coordinator',
    note: 'Office. Trainee records and joining documents. No assessment access.',
    nav: ['dashboard', 'trainees', 'reports'],
  },
  buddy: {
    title: 'Site Buddy',
    note: 'Sees only their own pod. Submits a weekly rating and signs checklist items.',
    nav: ['dashboard', 'trainees', 'modules', 'buddyRating'],
  },
};

export const NAV = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { key: 'daily', icon: CheckSquare, label: 'Daily entry', path: '/daily' },
  { key: 'trainees', icon: Users, label: 'Trainees', path: '/trainees' },
  { key: 'assessment', icon: ClipboardCheck, label: 'Assessment', path: '/assessment' },
  { key: 'modules', icon: PlayCircle, label: 'Modules & videos', path: '/modules' },
  { key: 'rotation', icon: RefreshCw, label: 'Rotation', path: '/rotation' },
  { key: 'buddyRating', icon: Star, label: 'Weekly rating', path: '/buddy-rating' },
  { key: 'reports', icon: FileText, label: 'Monthly pack', path: '/reports' },
  { key: 'users', icon: ShieldCheck, label: 'Users', path: '/users' },
  { key: 'settings', icon: SettingsIcon, label: 'Settings', path: '/settings' },
];

// Trainee nav lives in a separate mobile-first shell (TraineeShell), not the staff
// AppShell — different device/usage pattern per SPEC.md §1.
export const TRAINEE_NAV = [
  { key: 'today', icon: PlayCircle, label: 'Modules', path: '/t/today' },
  { key: 'mylog', icon: CheckSquare, label: 'My log', path: '/t/log' },
  { key: 'myband', icon: Award, label: 'My band', path: '/t/band' },
  { key: 'mychecklist', icon: ListChecks, label: 'Checklist', path: '/t/checklist' },
];
