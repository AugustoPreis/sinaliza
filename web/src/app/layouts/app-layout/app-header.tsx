import type { ReactElement } from 'react';

import { Box, Container, HStack } from '@shared/ui/layout';

import { AppBreadcrumbs } from './app-breadcrumbs';
import { AppMobileNav } from './app-mobile-nav';
import { AppUserMenu } from './app-user-menu';

export function AppHeader(): ReactElement {
  return (
    <Box as="header" className="border-b border-border bg-background/95 backdrop-blur">
      <Container className="flex w-full max-w-none items-center justify-between gap-4 py-3">
        <HStack align="center" gap={3} className="min-w-0 flex-1">
          <AppMobileNav />
          <AppBreadcrumbs />
        </HStack>

        <HStack align="center" gap={3}>
          <AppUserMenu />
        </HStack>
      </Container>
    </Box>
  );
}
