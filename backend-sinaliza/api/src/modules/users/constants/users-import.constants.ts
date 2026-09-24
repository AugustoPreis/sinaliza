// Column names/order for the bulk user import spreadsheet. Keep in sync
// with `GenerateUsersImportTemplateUseCase` and `ImportUsersUseCase`.
//
// `email_institucional` is the natural key for create-vs-update.
// `setor_papel`: "ADMIN" grants the ADMIN role; an existing sector name
// grants SECTOR and links the user to it; blank means REQUESTER only.
export const USERS_IMPORT_TEMPLATE_COLUMNS = [
  'nome',
  'email_institucional',
  'vinculo',
  'setor_papel',
] as const;

export const USERS_IMPORT_SHEET_NAME = 'usuarios';

export const USERS_IMPORT_ADMIN_ROLE_VALUE = 'ADMIN';
