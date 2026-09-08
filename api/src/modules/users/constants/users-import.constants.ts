// Official column names/order for the bulk user import spreadsheet (Tela
// C.3 / endpoints-sinaliza.md §13). Not fixed by the functional doc — this
// is the technical decision this project commits to. Keep this list in
// sync with `GenerateUsersImportTemplateUseCase` and `ImportUsersUseCase`.
//
// - `nome`: full name.
// - `email_institucional`: institutional e-mail, used as the natural key
//   for create-vs-update.
// - `vinculo`: one of `EInstitutionalLink` (ALUNO | PROFESSOR | SERVIDOR).
// - `setor_papel`: optional. "ADMIN" grants the ADMIN role; the name of an
//   existing sector grants the SECTOR role and links the user to that
//   sector; left blank, the user only gets the REQUESTER role.
export const USERS_IMPORT_TEMPLATE_COLUMNS = [
  'nome',
  'email_institucional',
  'vinculo',
  'setor_papel',
] as const;

export const USERS_IMPORT_SHEET_NAME = 'usuarios';

export const USERS_IMPORT_ADMIN_ROLE_VALUE = 'ADMIN';
