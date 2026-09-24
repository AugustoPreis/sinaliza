import { createFileRoute } from '@tanstack/react-router';

import { requireGuest } from '@core/auth/route-guards';

import { LoginPage } from '@features/auth';

export const Route = createFileRoute('/_auth/login')({
  beforeLoad: requireGuest,
  component: LoginPage,
});
