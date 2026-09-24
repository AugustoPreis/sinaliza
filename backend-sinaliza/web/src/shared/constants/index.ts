export const DEFAULT_PAGE_SIZE = 5;
export const MAX_PAGE_SIZE = 100;

// Min 8 chars, at least one lowercase, one uppercase, one digit, one
// special character. Must stay identical to the API's validator so client
// and server never disagree on what counts as a strong enough password.
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
