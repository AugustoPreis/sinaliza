export interface IAuthHandlers {
  refresh: () => Promise<boolean>;
  onSessionExpired: () => void;
}

let authHandlers: IAuthHandlers | null = null;

export function registerAuthHandlers(handlers: IAuthHandlers): void {
  authHandlers = handlers;
}

export function getAuthHandlers(): IAuthHandlers | null {
  return authHandlers;
}
