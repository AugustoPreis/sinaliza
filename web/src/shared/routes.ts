export const ROUTES = {
  home: '/',
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  account: '/account',
  noAccess: '/no-access',
  tickets: {
    queue: '/tickets',
    resolved: '/tickets/resolved',
    detail: (ticketId: string) => `/tickets/${ticketId}`,
  },
  admin: {
    tickets: '/admin/tickets',
    sectors: '/admin/sectors',
    usersPermissions: '/admin/users',
    research: '/admin/research',
  },
} as const;
