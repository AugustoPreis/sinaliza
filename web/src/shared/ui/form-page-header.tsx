import { ArrowLeft } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { Button } from '@shared/ui/button';
import { Box, HStack, Stack } from '@shared/ui/layout';
import { Heading, Text } from '@shared/ui/typography';

export interface FormPageHeaderProps {
  title: string;
  subtitle?: string;
  backLabel: string;
  onBack: () => void;
  actions?: ReactNode;
}

export function FormPageHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  actions,
}: FormPageHeaderProps): ReactElement {
  return (
    <Stack gap={4}>
      <Box>
        <Button type="button" variant="link" className="h-auto p-0" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" />
          {backLabel}
        </Button>
      </Box>

      <HStack justify="between" align="start" wrap gap={4}>
        <Stack gap={1}>
          <Heading level={1}>{title}</Heading>
          {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
        </Stack>

        {actions ? <HStack gap={2}>{actions}</HStack> : null}
      </HStack>
    </Stack>
  );
}
