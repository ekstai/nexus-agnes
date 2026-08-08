import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { THEMES } from './themes';
import type { ThemeType } from '@shared/api.interface';

interface ThemeContextValue {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'agnes-theme';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    if (typeof window === 'undefined') return 'liquid-glass';
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeType | null;
    return saved && THEMES[saved] ? saved : 'liquid-glass';
  });

  useEffect(() => {
    const themeDef = THEMES[theme];
    if (!themeDef) return;

    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.transition = 'background-color 0.3s ease, color 0.3s ease';

    Object.entries(themeDef.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    const transitionTimer = setTimeout(() => {
      root.style.transition = '';
    }, 300);

    localStorage.setItem(STORAGE_KEY, theme);

    return () => clearTimeout(transitionTimer);
  }, [theme]);

  const setTheme = (newTheme: ThemeType) => {
    if (THEMES[newTheme]) {
      setThemeState(newTheme);
    }
  };

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
};
