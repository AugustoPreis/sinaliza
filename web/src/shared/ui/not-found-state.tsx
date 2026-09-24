import type { ReactElement } from 'react';

import { Stack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

export interface NotFoundStateProps {
  message: string;
}

export function NotFoundState({ message }: NotFoundStateProps): ReactElement {
  return (
    <Stack align="center" justify="center" gap={2} className="py-12 text-center">
      <Text tone="muted">{message}</Text>
    </Stack>
  );
}
