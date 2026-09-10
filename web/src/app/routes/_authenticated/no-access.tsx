import { createFileRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Container, Stack } from '@shared/ui/layout';
import { Heading, Text } from '@shared/ui/typography';

// Dead-end landing for an authenticated user whose permissions don't grant
// any screen in this admin web app (e.g. REQUESTER) — see
// `resolveLandingRoute` for why every guard funnels here instead of
// bouncing between two equally-guarded routes.
function NoAccessPage(): ReactElement {
  const { t } = useTranslation('common');

  return (
    <Container>
      <Stack align="center" justify="center" gap={2} className="py-16 text-center">
        <Heading level={1}>{t('pages.noAccess.title')}</Heading>
        <Text tone="muted">{t('pages.noAccess.description')}</Text>
      </Stack>
    </Container>
  );
}

export const Route = createFileRoute('/_authenticated/no-access')({
  component: NoAccessPage,
});
