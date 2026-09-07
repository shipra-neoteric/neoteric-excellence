import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);
const PRIMARY = '#12355b'; // Neoteric Excellence's single fixed brand color — no per-company theming (one tenant)

// The actual "no flash" application happens in a blocking inline script in
// index.html's <head>, before React even mounts (style guide §4) — this just
// mirrors whatever class is already on <html> into React state.
function getInitialTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      localStorage.setItem('theme', next);
      return next;
    });
  }

  const value = { theme, toggleTheme, getThemeColor: () => PRIMARY };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
