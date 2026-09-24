import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@core/auth/route-guards';

import { NewTicketPage } from '@features/tickets/pages/new-ticket.page';

export const Route = createFileRoute('/_authenticated/tickets/new')({
  beforeLoad: () => {
    requirePermission('tickets', 'create')();
    requirePermission('classification', 'preview')();
  },
  component: NewTicketPage,
  staticData: { breadcrumb: 'breadcrumbs.newTicket' },
});
