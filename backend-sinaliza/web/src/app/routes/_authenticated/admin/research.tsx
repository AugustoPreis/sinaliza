import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@core/auth/route-guards';

import { AdminResearchIndicatorsPage } from '@features/admin';

export const Route = createFileRoute('/_authenticated/admin/research')({
  beforeLoad: requirePermission('research', 'read'),
  component: AdminResearchIndicatorsPage,
  staticData: { breadcrumb: 'breadcrumbs.adminResearch' },
});
