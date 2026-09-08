import { createFileRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@shared/ui/coming-soon';
import { Container } from '@shared/ui/layout';

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
  staticData: { breadcrumb: 'breadcrumbs.settings' },
});

function SettingsPage(): ReactElement {
  const { t } = useTranslation();

  return (
    <Container>
      <ComingSoon title={t('pages.settings.title')} description={t('pages.settings.description')} />
    </Container>
  );
}
