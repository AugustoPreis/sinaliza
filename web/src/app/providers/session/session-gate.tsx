import { Loader2 } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { Box } from '@shared/ui/layout';

import { useSessionBootstrap } from '@features/auth';

export interface SessionGateProps {
  children: ReactNode;
}

export function SessionGate({ children }: SessionGateProps): ReactElement {
  const { isBootstrapping } = useSessionBootstrap();

  if (isBootstrapping) {
    return (
      <Box as="main" className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </Box>
    );
  }

  return <>{children}</>;
}
