import type { ReactElement } from 'react';
import { Toaster } from 'sonner';

import { useThemeMode } from './theme-mode.context';

export function ThemedToaster(): ReactElement {
  const { resolvedMode } = useThemeMode();

  return <Toaster theme={resolvedMode} />;
}
