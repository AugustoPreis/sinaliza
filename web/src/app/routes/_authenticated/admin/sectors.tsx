import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@core/auth/route-guards';

import { AdminSectorsPage } from '@features/admin';

export const Route = createFileRoute('/_authenticated/admin/sectors')({
  beforeLoad: requirePermission('sectors', 'read'),
  component: AdminSectorsPage,
  staticData: { breadcrumb: 'breadcrumbs.adminSectors' },
});
