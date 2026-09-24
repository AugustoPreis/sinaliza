import { z } from 'zod';

import { i18next } from '@core/i18n';

export const sectorFormSchema = z.object({
  name: z.string().min(1, i18next.t('validation:required')).max(255),
  categories: z.array(z.string()).min(1, i18next.t('validation:required')),
  responsible_user_ids: z.array(z.string()),
});

export type SectorFormValues = z.infer<typeof sectorFormSchema>;
