import { z } from 'zod';

import { i18next } from '@core/i18n';

export const INSTITUTIONAL_LINKS = ['ALUNO', 'PROFESSOR', 'SERVIDOR'] as const;

export type TInstitutionalLink = (typeof INSTITUTIONAL_LINKS)[number];

// Sentinel values for the "setor_papel" picker: a plain sector uuid means
// "Setor vinculado", these two mean the other two role outcomes (see
// `users-import.constants.ts` for the same three-way mapping used by the
// bulk import spreadsheet).
export const SECTOR_ROLE_NONE = '__NONE__';
export const SECTOR_ROLE_ADMIN = '__ADMIN__';

export const createUserFormSchema = z.object({
  name: z.string().min(1, i18next.t('validation:required')).max(255),
  email: z.string().min(1, i18next.t('validation:required')).email(i18next.t('validation:email')),
  institutionalLink: z.enum(INSTITUTIONAL_LINKS),
  sectorRole: z.string().min(1, i18next.t('validation:required')),
});

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
