import { registerAuthHandlers } from '@core/api/http/auth-handlers';
import { useAuthStore } from '@core/auth/auth.store';
import { ROUTES } from '@shared/routes';

import { refresh } from '@features/auth';

import { router } from '../../router/router';

// Mirrors app/routes/_auth/. onSessionExpired also fires on the very first
// /auth/me 401 (normal "not logged in yet"), so it must not redirect away
// from one of these.
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
