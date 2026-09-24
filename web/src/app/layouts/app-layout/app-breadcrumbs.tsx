import { useMatches } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { HStack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

interface IAppBreadcrumb {
  key: string;
  label: string;
}

export function AppBreadcrumbs(): ReactElement | null {
  const { t } = useTranslation();
  const matches = useMatches();

  const crumbs = matches.reduce<IAppBreadcrumb[]>((acc, match) => {
    const breadcrumb = match.staticData.breadcrumb;

    if (breadcrumb) {
      acc.push({ key: match.id, label: t(breadcrumb) });
    }

    return acc;
  }, []);

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <HStack as="nav" gap={2} align="center" className="min-w-0">
      {crumbs.map((crumb, index) => (
        <HStack key={crumb.key} gap={2} align="center">
          {index > 0 ? (
            <ChevronRight size={14} aria-hidden="true" className="text-muted-foreground" />
          ) : null}
          <Text size="sm" weight="medium" className="truncate">
            {crumb.label}
          </Text>
        </HStack>
      ))}
    </HStack>
  );
}
