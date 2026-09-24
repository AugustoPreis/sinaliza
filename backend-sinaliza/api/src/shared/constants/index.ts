export const APP_NAME = 'Sinaliza';

export const JWT_STRATEGY = 'jwt';
export const LOCAL_STRATEGY = 'local';

export const PUBLIC_SCHEMA = 'public';

export const DEFAULT_PAGE_SIZE = 5;
export const MAX_PAGE_SIZE = 100;

/**
 * Only reserved role by the platform. Any other role (REQUESTER, SECTOR,
 * ADMIN) is data (RBAC via Role/Permission), never a fixed enum in the code.
 */
export const ROLE_ADMIN = 'ADMIN';
export const ROLE_REQUESTER = 'REQUESTER';
export const ROLE_SECTOR = 'SECTOR';

// Min 8 chars, at least one lowercase, one uppercase, one digit, one
// special character.
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
