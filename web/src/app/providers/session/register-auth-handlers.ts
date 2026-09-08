import { registerAuthHandlers } from '@core/api/http/auth-handlers';
import { useAuthStore } from '@core/auth/auth.store';
import { ROUTES } from '@shared/routes';

import { refresh } from '@features/auth';

import { router } from '../../router/router';

// Mirrors the routes under app/routes/_auth/ — pages reachable while logged
// out. onSessionExpired fires on the very first /auth/me 401 too (the normal
// "not logged in yet" bootstrap outcome, not just a session dying mid-browse),
// so it must not force a redirect away from one of these.
const PUBLIC_PATHS: string[] = [ROUTES.login, ROUTES.forgotPassword, ROUTES.resetPassword];

export function registerRealAuthHandlers(): void {
  registerAuthHandlers({
    refresh: async () => {
      try {
        const { user } = await refresh();

        useAuthStore.getState().setUser(user);

        return true;
      } catch {
        return false;
      }
    },
    onSessionExpired: () => {
      useAuthStore.getState().clear();

      const isOnPublicRoute = PUBLIC_PATHS.includes(router.state.location.pathname);

      if (!isOnPublicRoute) {
        void router.navigate({ to: ROUTES.login });
      }
    },
  });
}
