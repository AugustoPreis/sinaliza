import type { ReactElement } from 'react';

import { Stack } from '@shared/ui/layout';
import { Heading, Text } from '@shared/ui/typography';

export interface ComingSoonProps {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps): ReactElement {
  return (
    <Stack gap={2}>
      <Heading level={1}>{title}</Heading>
      <Text tone="muted">{description}</Text>
    </Stack>
  );
}
