import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { ROUTES } from '@shared/routes';
import { Box, HStack } from '@shared/ui/layout';

export interface AppBrandProps {
  collapsed?: boolean;
}

export function AppBrand({ collapsed = false }: AppBrandProps): ReactElement {
  const { t } = useTranslation();
  const appName = t('appName');

  return (
    <Link to={ROUTES.home} className="min-w-0">
      <HStack align="center" gap={3}>
        <Box className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-background">
          {appName.charAt(0).toUpperCase()}
        </Box>
        {!collapsed ? (
          <Box className="truncate text-sm font-semibold text-foreground">{appName}</Box>
        ) : null}
      </HStack>
    </Link>
  );
}
