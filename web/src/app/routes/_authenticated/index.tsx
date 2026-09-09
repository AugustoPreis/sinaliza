import { createFileRoute, redirect } from '@tanstack/react-router';

import { useAuthStore } from '@core/auth/auth.store';
import { hasPermission } from '@core/auth/permissions';
import { ROUTES } from '@shared/routes';

import { AdminDashboardPage } from '@features/admin';

// "/" is the Painel Geral for whoever can see every sector (tickets:read-all)
// — everyone else (sector agents) lands on their own queue instead.
export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => {
    const permissions = useAuthStore.getState().user?.permissions ?? [];

    if (!hasPermission(permissions, 'tickets:read-all')) {
      throw redirect({ to: ROUTES.tickets.queue });
    }
  },
  component: AdminDashboardPage,
  staticData: { breadcrumb: 'breadcrumbs.dashboard' },
});
