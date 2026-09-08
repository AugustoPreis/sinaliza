import { Link } from '@tanstack/react-router';
import { Fragment, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { usePermissions } from '@core/auth/use-permissions.hook';
import { Stack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

import { APP_NAV_ITEMS, type IAppNavItem } from './app-nav-items';
import { getSidebarItemClasses } from './sidebar-item-classes';

export interface AppNavProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function AppNav({ onNavigate, collapsed = false }: AppNavProps): ReactElement {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  function isNavItemVisible(item: IAppNavItem): boolean {
    return !item.permission || hasPermission(item.permission);
  }

  const items = APP_NAV_ITEMS.filter(isNavItemVisible);

  return (
    <Stack as="nav" gap={1}>
      {items.map((item, index) => {
        const Icon = item.icon;
        const isNewGroup = index === 0 || items[index - 1]?.group !== item.group;

        return (
          <Fragment key={item.to}>
            {isNewGroup && !collapsed ? (
              <Text
                size="sm"
                weight="medium"
                tone="muted"
                className="px-3 pt-4 text-xs uppercase tracking-wide first:pt-0"
              >
                {t(item.group)}
              </Text>
            ) : null}
            <Link
              to={item.to}
              onClick={onNavigate}
              className={getSidebarItemClasses(collapsed)}
              activeProps={{ className: 'bg-accent text-accent-foreground' }}
            >
              <Icon size={18} aria-hidden="true" />
              {!collapsed && t(item.labelKey)}
            </Link>
          </Fragment>
        );
      })}
    </Stack>
  );
}
