export const ROUTES = {
  home: '/',
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  account: '/account',
  preferences: '/preferences',
  settings: '/settings',
  tickets: {
    queue: '/tickets',
    resolved: '/tickets/resolved',
    detail: (ticketId: string) => `/tickets/${ticketId}`,
  },
  admin: {
    tickets: '/admin/tickets',
    sectors: '/admin/sectors',
    usersImport: '/admin/users/import',
    usersPermissions: '/admin/users',
    research: '/admin/research',
  },
} as const;
