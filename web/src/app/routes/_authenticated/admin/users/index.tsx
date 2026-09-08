import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@core/auth/route-guards';

import { AdminUsersPermissionsPage } from '@features/admin';

export const Route = createFileRoute('/_authenticated/admin/users/')({
  beforeLoad: requirePermission('users', 'read'),
  component: AdminUsersPermissionsPage,
  staticData: { breadcrumb: 'breadcrumbs.adminUsersPermissions' },
});
