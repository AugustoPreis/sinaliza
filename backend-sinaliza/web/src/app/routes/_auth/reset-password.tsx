import { createFileRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { z } from 'zod';

import { requireGuest } from '@core/auth/route-guards';

import { ResetPasswordPage } from '@features/auth';

const resetPasswordSearchSchema = z.object({
  token: z.string(),
});

export const Route = createFileRoute('/_auth/reset-password')({
  validateSearch: resetPasswordSearchSchema,
  beforeLoad: requireGuest,
  component: RouteComponent,
});

function RouteComponent(): ReactElement {
  const { token } = Route.useSearch();

  return <ResetPasswordPage token={token} />;
}
