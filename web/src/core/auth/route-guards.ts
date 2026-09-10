import { redirect } from '@tanstack/react-router';

import { ROUTES } from '@shared/routes';

import { useAuthStore } from './auth.store';
import { hasPermission, resolveLandingRoute } from './permissions';

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

// Redirects to whatever screen this user's permissions actually grant,
// never blindly to "/" — "/" itself requires a permission (tickets:read-all)
// that not every role has, and bouncing there unconditionally is how a
// REQUESTER (no tickets:read-all, no tickets:read-sector) ends up in an
// infinite redirect loop between "/" and "/tickets".
export function requirePermission(resource: string, action: string): () => void {
  return () => {
    const permissions = useAuthStore.getState().user?.permissions ?? [];

    if (!hasPermission(permissions, `${resource}:${action}`)) {
      throw redirect({ to: resolveLandingRoute(permissions) });
    }
  };
}
