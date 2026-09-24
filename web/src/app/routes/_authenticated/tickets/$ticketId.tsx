import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@core/auth/route-guards';

import { TicketDetailPage } from '@features/tickets';

export const Route = createFileRoute('/_authenticated/tickets/$ticketId')({
  beforeLoad: requirePermission('tickets', 'read-sector'),
  component: TicketDetailPage,
  staticData: { breadcrumb: 'breadcrumbs.sectorTicketDetail' },
});
