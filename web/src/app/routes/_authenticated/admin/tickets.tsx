import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@core/auth/route-guards';

import { AdminDashboardPage } from '@features/admin';

export const Route = createFileRoute('/_authenticated/admin/tickets')({
  beforeLoad: requirePermission('tickets', 'read-all'),
  component: AdminDashboardPage,
  staticData: { breadcrumb: 'breadcrumbs.adminDashboard' },
});
