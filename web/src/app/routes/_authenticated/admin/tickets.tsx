import { createFileRoute, redirect } from '@tanstack/react-router';

import { ROUTES } from '@shared/routes';

// Painel Geral now lives at "/" (the authenticated home) — this path is
// kept only so old links/bookmarks still land somewhere valid.
export const Route = createFileRoute('/_authenticated/admin/tickets')({
  beforeLoad: () => {
    throw redirect({ to: ROUTES.home });
  },
});
