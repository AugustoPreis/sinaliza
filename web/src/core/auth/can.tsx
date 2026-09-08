import type { ReactElement, ReactNode } from 'react';

import { usePermissions } from './use-permissions.hook';

export interface CanProps {
  permission: string;
  children: ReactNode;
}

export function Can({ permission, children }: CanProps): ReactElement | null {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return null;
  }

  return <>{children}</>;
}
