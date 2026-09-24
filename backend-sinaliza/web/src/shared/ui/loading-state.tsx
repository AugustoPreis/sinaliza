import { Loader2 } from 'lucide-react';
import type { ReactElement } from 'react';

import { HStack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

export interface LoadingStateProps {
  message: string;
}

export function LoadingState({ message }: LoadingStateProps): ReactElement {
  return (
    <HStack align="center" justify="center" gap={2} className="py-12">
      <Loader2 size={18} aria-hidden="true" className="animate-spin text-muted-foreground" />
      <Text tone="muted">{message}</Text>
    </HStack>
  );
}
