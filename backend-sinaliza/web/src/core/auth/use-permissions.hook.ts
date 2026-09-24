import { useAuthStore } from './auth.store';
import { hasAnyPermission, hasPermission } from './permissions';

export interface IUsePermissions {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

// Stable reference: the store selector must return the same array instance
// across renders when there's no user, otherwise Zustand's useSyncExternalStore
// sees a "changed" snapshot on every render and loops forever.
const EMPTY_PERMISSIONS: string[] = [];

export function usePermissions(): IUsePermissions {
  const permissions = useAuthStore((state) => state.user?.permissions ?? EMPTY_PERMISSIONS);

  return {
    permissions,
    hasPermission: (permission) => hasPermission(permissions, permission),
    hasAnyPermission: (required) => hasAnyPermission(permissions, required),
  };
}
