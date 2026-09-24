import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Container, Stack } from '@shared/ui/layout';
import { SectionHeading } from '@shared/ui/section-heading';
import { Heading, Text } from '@shared/ui/typography';

import { ChangePasswordForm } from '../components/change-password-form';

export function AccountPage(): ReactElement {
  const { t } = useTranslation('account');

  return (
    <Container>
      <Stack gap={6}>
        <Stack gap={1}>
          <Heading level={1}>{t('title')}</Heading>
          <Text tone="muted">{t('subtitle')}</Text>
        </Stack>

        <Stack gap={4} className="max-w-xl">
          <SectionHeading
            title={t('password.sectionTitle')}
            description={t('password.sectionDescription')}
          />
          <ChangePasswordForm />
        </Stack>
      </Stack>
    </Container>
  );
}
