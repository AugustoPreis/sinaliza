import { createFileRoute, redirect } from '@tanstack/react-router';

import { useAuthStore } from '@core/auth/auth.store';
import { hasPermission, resolveLandingRoute } from '@core/auth/permissions';

import { AdminDashboardPage } from '@features/admin';

// "/" is the Painel Geral for whoever can see every sector (tickets:read-all)
// — everyone else is sent to wherever `resolveLandingRoute` says they
// actually belong (their sector queue, or the "no access" dead end), never
// blindly to "/tickets" (a REQUESTER has neither permission, which used to
// bounce forever between the two routes).
export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => {
    const permissions = useAuthStore.getState().user?.permissions ?? [];

    if (!hasPermission(permissions, 'tickets:read-all')) {
      throw redirect({ to: resolveLandingRoute(permissions) });
    }
  },
  component: AdminDashboardPage,
  staticData: { breadcrumb: 'breadcrumbs.dashboard' },
});
