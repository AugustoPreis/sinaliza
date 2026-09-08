import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@core/auth/route-guards';

import { AdminUsersImportPage } from '@features/admin';

export const Route = createFileRoute('/_authenticated/admin/users/import')({
  beforeLoad: requirePermission('users', 'import'),
  component: AdminUsersImportPage,
  staticData: { breadcrumb: 'breadcrumbs.adminUsersImport' },
});
