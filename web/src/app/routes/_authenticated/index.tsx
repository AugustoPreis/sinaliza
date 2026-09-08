import { createFileRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Container, Stack } from '@shared/ui/layout';
import { Heading, Text } from '@shared/ui/typography';

import { LogoutButton } from '@features/auth';

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
  staticData: { breadcrumb: 'breadcrumbs.dashboard' },
});

function HomePage(): ReactElement {
  const { t } = useTranslation();

  return (
    <Container>
      <Stack align="center" gap={4}>
        <Heading level={1}>{t('appName')}</Heading>
        <Text tone="muted">{t('stackTagline')}</Text>
        <LogoutButton />
      </Stack>
    </Container>
  );
}
