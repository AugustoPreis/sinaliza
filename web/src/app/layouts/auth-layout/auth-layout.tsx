import type { ReactElement } from 'react';

import { LogoHorizontal } from '@shared/assets/brand/logo';
import { Box, Stack } from '@shared/ui/layout';
import { Heading } from '@shared/ui/typography';

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({ title, children, footer }: AuthLayoutProps): ReactElement {
  return (
    <Box as="main" className="flex min-h-screen items-center justify-center">
      <Stack gap={6} className="w-full max-w-sm">
        <LogoHorizontal className="h-9 w-auto self-start" />
        <Heading level={1}>{title}</Heading>
        {children}
        {footer}
      </Stack>
    </Box>
  );
}
