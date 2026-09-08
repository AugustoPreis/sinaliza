import type { ReactElement, ReactNode } from 'react';

import { Box, Stack } from '@shared/ui/layout';

import { AppFooter } from './app-footer';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';

export interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): ReactElement {
  return (
    <Box as="main" className="min-h-screen bg-background text-foreground">
      <Stack gap={0} className="min-h-screen">
        <AppHeader />

        <Box className="flex flex-1">
          <AppSidebar />

          <Box as="section" className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </Box>
        </Box>

        <AppFooter />
      </Stack>
    </Box>
  );
}
