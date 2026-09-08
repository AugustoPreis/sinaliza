import { Outlet, createFileRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { AppLayout } from '@app/layouts/app-layout';

import { requireAuth } from '@core/auth/route-guards';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: requireAuth,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout(): ReactElement {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
