import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Container } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

export function AppFooter(): ReactElement {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <Box as="footer" className="border-t border-border bg-background">
      <Container className="flex flex-col gap-1 py-3 items-center">
        <Text size="sm" tone="muted">
          {t('footer.copyright', { year, appName: t('appName'), version: __APP_VERSION__ })}
        </Text>
      </Container>
    </Box>
  );
}
