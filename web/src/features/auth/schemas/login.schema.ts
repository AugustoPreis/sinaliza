import { z } from 'zod';

import { i18next } from '@core/i18n';

export const loginSchema = z.object({
  identifier: z.string().min(1, i18next.t('validation:required')),
  password: z.string().min(1, i18next.t('validation:required')),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
