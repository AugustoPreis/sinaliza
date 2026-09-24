import { RouterProvider } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { I18nProvider } from './providers/i18n';
import { QueryProvider } from './providers/query';
import { registerRealAuthHandlers, SessionGate } from './providers/session';
import { ThemeProvider, ThemedToaster } from './providers/theme';
import { router } from './router/router';

registerRealAuthHandlers();

export function App(): ReactElement {
  return (
    <QueryProvider>
      <ThemeProvider>
        <I18nProvider>
          <SessionGate>
            <RouterProvider router={router} />
          </SessionGate>
          <ThemedToaster />
        </I18nProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
