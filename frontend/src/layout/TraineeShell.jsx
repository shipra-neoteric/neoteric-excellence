import { LogOut, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { TRAINEE_NAV } from '../auth/roles';
import { useTheme } from '../context/ThemeContext';
import { confirmSignOut } from '../ui/confirm';

export default function TraineeShell() {
  const { session, isTrainee, signOut } = useAuth();
  const { theme, toggleTheme, getThemeColor } = useTheme();
  // Whether the Checklist tab is switched on system-wide (Settings.jsx, admin-only) —
  // defaults to true so it doesn't flicker away while this loads.
  const [checklistEnabled, setChecklistEnabled] = useState(true);

  useEffect(() => {
    api.get('/settings').then((s) => setChecklistEnabled(s.traineeChecklistEnabled)).catch(() => {});
  }, []);

  if (!session) return <Navigate to="/login" replace />;
  if (!isTrainee) return <Navigate to="/dashboard" replace />;

  const navItems = TRAINEE_NAV.filter((item) => item.key !== 'mychecklist' || checklistEnabled);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="h-14 flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <h1 className="text-base font-bold text-gray-900 dark:text-white flex-1 truncate">{session.name}</h1>
        <button onClick={toggleTheme} aria-label="Toggle theme"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button onClick={async () => { if (await confirmSignOut()) signOut(); }} aria-label="Sign out"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <Outlet context={{ checklistEnabled }} />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 flex bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-20">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.key} to={item.path}
              className="flex-1 flex flex-col items-center gap-1 py-2 text-[11px]"
              style={({ isActive }) => ({ color: isActive ? getThemeColor() : undefined })}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 ${isActive ? '' : 'text-gray-400'}`} style={isActive ? { color: getThemeColor() } : undefined} />
                  <span className={isActive ? 'font-semibold' : 'text-gray-400'} style={isActive ? { color: getThemeColor() } : undefined}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
