import { ChevronLeft, ChevronRight, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { NAV } from '../auth/roles';
import { useTheme } from '../context/ThemeContext';
import { confirmSignOut } from '../ui/confirm';

function getInitials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function NavItem({ item, active, collapsed, getThemeColor, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.path} onClick={onNavigate}
      className={`group relative flex items-center gap-2.5 text-[15px] py-2 rounded-lg transition-colors
        ${collapsed ? 'justify-center px-2' : 'px-2.5'}
        ${active ? 'font-semibold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
      style={active ? { backgroundColor: `${getThemeColor()}1a`, color: getThemeColor() } : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && item.label}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700
          px-2.5 py-1.5 text-xs font-medium text-white opacity-0 scale-95 origin-left transition-all
          group-hover:opacity-100 group-hover:scale-100">
          {item.label}
        </span>
      )}
    </NavLink>
  );
}

export default function AppShell() {
  const { role, session, isTrainee, signOut } = useAuth();
  const { theme, toggleTheme, getThemeColor } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar.collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!session) return <Navigate to="/login" replace />;
  if (isTrainee) return <Navigate to="/t/today" replace />;

  const items = NAV.filter((item) => role.nav.includes(item.key));
  const current = items.find((i) => location.pathname.startsWith(i.path));

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem('sidebar.collapsed', String(!c));
      return !c;
    });
  }

  const sidebar = (
    <nav className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-gray-800 transform transition-all duration-300 ease-in-out
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} w-72 max-w-[85vw]
      lg:static lg:translate-x-0 lg:z-auto lg:my-1 lg:ml-1 lg:rounded-xl lg:bg-white/90 lg:dark:bg-gray-800/95
      lg:backdrop-blur-xl lg:shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}>
      <div className="h-16 flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: getThemeColor() }}>NE</div>
        {!collapsed && (
          <>
            <div className="min-w-0">
              <div className="font-bold text-sm text-gray-900 dark:text-white truncate">Neoteric Excellence</div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500">Batch 2026-01</div>
            </div>
            <button onClick={toggleCollapsed} aria-label="Collapse sidebar"
              className="hidden lg:flex ml-auto w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
        <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
          className="lg:hidden ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      {collapsed && (
        <button onClick={toggleCollapsed} aria-label="Expand sidebar"
          className="hidden lg:flex items-center justify-center py-3 border-b border-gray-100 dark:border-gray-700
            text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0">
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {!collapsed && (
        <div className="px-2.5 pt-4 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider pointer-events-none">
          Menu
        </div>
      )}
      <div className={`flex-1 space-y-0.5 overflow-y-auto overflow-x-visible custom-scrollbar ${collapsed ? 'px-2 pt-4' : 'px-2.5'}`}>
        {items.map((item) => (
          <NavItem key={item.key} item={item} active={current?.key === item.key}
            collapsed={collapsed} getThemeColor={getThemeColor} onNavigate={() => setMobileOpen(false)} />
        ))}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      {sidebar}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-16 flex items-center gap-3 sm:gap-4 px-4 sm:px-6 border-b border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex-1 truncate">{current?.label ?? 'Neoteric Excellence'}</h1>
          <button onClick={toggleTheme} aria-label="Toggle theme"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95 flex-shrink-0">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: getThemeColor() }}>{getInitials(session.name)}</div>
            <div className="hidden sm:block text-xs text-gray-500 dark:text-gray-400">
              <div className="font-medium text-gray-700 dark:text-gray-200">{session.name}</div>
              <div>{role.title}</div>
            </div>
          </div>
          <button onClick={async () => { if (await confirmSignOut()) signOut(); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95 flex-shrink-0"
            aria-label="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
