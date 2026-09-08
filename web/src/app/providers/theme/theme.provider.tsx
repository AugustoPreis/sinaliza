import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from 'react';

import { ThemeModeContext, type ResolvedThemeMode } from './theme-mode.context';
import { useThemeStore } from './theme.store';

function getSystemThemeMode(): ResolvedThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const [systemMode, setSystemMode] = useState<ResolvedThemeMode>(getSystemThemeMode);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function handleChange(): void {
      setSystemMode(getSystemThemeMode());
    }

    media.addEventListener('change', handleChange);

    return () => media.removeEventListener('change', handleChange);
  }, []);

  const resolvedMode = mode === 'system' ? systemMode : mode;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedMode === 'dark');
  }, [resolvedMode]);

  const value = useMemo(() => ({ mode, resolvedMode, setMode }), [mode, resolvedMode, setMode]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}
