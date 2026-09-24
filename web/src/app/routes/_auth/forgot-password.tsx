import { createFileRoute } from '@tanstack/react-router';

import { requireGuest } from '@core/auth/route-guards';

import { ForgotPasswordPage } from '@features/auth';

export const Route = createFileRoute('/_auth/forgot-password')({
  beforeLoad: requireGuest,
  component: ForgotPasswordPage,
});
