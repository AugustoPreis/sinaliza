import { createContext, useContext } from 'react';

import type { ThemeMode } from './theme.store';

export type ResolvedThemeMode = 'light' | 'dark';

export interface IThemeModeContext {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeModeContext = createContext<IThemeModeContext | null>(null);

export function useThemeMode(): IThemeModeContext {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider.');
  }

  return context;
}
