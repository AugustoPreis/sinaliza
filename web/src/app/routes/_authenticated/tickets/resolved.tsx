import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@core/auth/route-guards';

import { SectorTicketsResolvedPage } from '@features/tickets';

export const Route = createFileRoute('/_authenticated/tickets/resolved')({
  beforeLoad: requirePermission('tickets', 'read-sector'),
  component: SectorTicketsResolvedPage,
  staticData: { breadcrumb: 'breadcrumbs.sectorResolved' },
});
