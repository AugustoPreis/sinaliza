import { z } from 'zod';

import { i18next } from '@core/i18n';

export const ROLE_NAMES = ['REQUESTER', 'SECTOR', 'ADMIN'] as const;

export type TRoleName = (typeof ROLE_NAMES)[number];

export const userPermissionsFormSchema = z
  .object({
    roles: z.array(z.enum(ROLE_NAMES)).min(1, i18next.t('validation:required')),
    sector_ids: z.array(z.string()),
  })
  .refine((value) => !value.roles.includes('SECTOR') || value.sector_ids.length > 0, {
    message: i18next.t('validation:required'),
    path: ['sector_ids'],
  });

export type UserPermissionsFormValues = z.infer<typeof userPermissionsFormSchema>;
