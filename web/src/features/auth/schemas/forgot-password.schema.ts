import { z } from 'zod';

import { i18next } from '@core/i18n';

export const forgotPasswordSchema = z.object({
  email: z.email(i18next.t('validation:email')),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
