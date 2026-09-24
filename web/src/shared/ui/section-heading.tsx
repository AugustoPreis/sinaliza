import type { ReactElement } from 'react';

import { Stack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

export interface SectionHeadingProps {
  title: string;
  description: string;
}

export function SectionHeading({ title, description }: SectionHeadingProps): ReactElement {
  return (
    <Stack gap={1}>
      <Text weight="semibold">{title}</Text>
      <Text size="sm" tone="muted">
        {description}
      </Text>
    </Stack>
  );
}
