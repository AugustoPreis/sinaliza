export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required);
}

export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  return required.some((permission) => permissions.includes(permission));
}

// Single source of truth for "where does this user land". Used both by the
// "/" guard and by every `requirePermission` fallback, so a user who lacks
// every screen's permission (e.g. REQUESTER, which has no screen in this
// admin web app yet) is sent to a dead-end "no access" page instead of
// bouncing between two guarded routes forever.
export function resolveLandingRoute(permissions: string[]): string {
  if (hasPermission(permissions, 'tickets:read-all')) return '/';
  if (hasPermission(permissions, 'tickets:read-sector')) return '/tickets';

  return '/no-access';
}
