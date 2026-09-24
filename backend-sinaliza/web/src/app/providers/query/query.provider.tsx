import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';

import { queryClient } from './query-client';

export interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps): ReactElement {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
