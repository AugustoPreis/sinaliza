import {
  Building2,
  Gauge,
  Inbox,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { ROUTES } from '@shared/routes';

export interface IAppNavItem {
  labelKey: string;
  to: string;
  icon: LucideIcon;
  group: string;
  permission?: string;
}

export const APP_NAV_ITEMS = [
  {
    labelKey: 'nav.dashboard',
    to: ROUTES.home,
    icon: LayoutDashboard,
    group: 'nav.groups.general',
  },
  {
    labelKey: 'nav.sectorQueue',
    to: ROUTES.tickets.queue,
    icon: Inbox,
    group: 'nav.groups.sector',
    permission: 'tickets:read-sector',
  },
  {
    labelKey: 'nav.sectorResolved',
    to: ROUTES.tickets.resolved,
    icon: ListChecks,
    group: 'nav.groups.sector',
    permission: 'tickets:read-sector',
  },
  {
    labelKey: 'nav.adminDashboard',
    to: ROUTES.admin.tickets,
    icon: Gauge,
    group: 'nav.groups.administration',
    permission: 'tickets:read-all',
  },
  {
    labelKey: 'nav.adminSectors',
    to: ROUTES.admin.sectors,
    icon: Building2,
    group: 'nav.groups.administration',
    permission: 'sectors:read',
  },
  {
    labelKey: 'nav.adminUsersImport',
    to: ROUTES.admin.usersImport,
    icon: Upload,
    group: 'nav.groups.administration',
    permission: 'users:import',
  },
  {
    labelKey: 'nav.adminUsersPermissions',
    to: ROUTES.admin.usersPermissions,
    icon: Users,
    group: 'nav.groups.administration',
    permission: 'users:read',
  },
  {
    labelKey: 'nav.adminResearch',
    to: ROUTES.admin.research,
    icon: LineChart,
    group: 'nav.groups.administration',
    permission: 'research:read',
  },
] as const satisfies IAppNavItem[];
