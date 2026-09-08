import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@core/auth/route-guards';

import { SectorTicketsListPage } from '@features/tickets';

export const Route = createFileRoute('/_authenticated/tickets/')({
  beforeLoad: requirePermission('tickets', 'read-sector'),
  component: SectorTicketsListPage,
  staticData: { breadcrumb: 'breadcrumbs.sectorQueue' },
});
