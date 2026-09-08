import { z } from 'zod';

import { i18next } from '@core/i18n';

export const reassignTicketSchema = z.object({
  target_sector_id: z.string().min(1, i18next.t('validation:required')),
  reason: z.string().min(1, i18next.t('validation:required')).max(2000),
});

export type ReassignTicketFormValues = z.infer<typeof reassignTicketSchema>;
