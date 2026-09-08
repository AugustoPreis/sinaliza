import { redirect } from '@tanstack/react-router';

import { ROUTES } from '@shared/routes';

import { useAuthStore } from './auth.store';
import { hasPermission } from './permissions';

export function requireAuth(): void {
  if (useAuthStore.getState().status !== 'authenticated') {
    throw redirect({ to: ROUTES.login });
  }
}

export function requireGuest(): void {
  if (useAuthStore.getState().status === 'authenticated') {
    throw redirect({ to: ROUTES.home });
  }
}

export function requirePermission(resource: string, action: string): () => void {
  return () => {
    const permissions = useAuthStore.getState().user?.permissions ?? [];

    if (!hasPermission(permissions, `${resource}:${action}`)) {
      throw redirect({ to: ROUTES.home });
    }
  };
}
