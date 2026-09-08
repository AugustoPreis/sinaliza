import type { ReactElement } from 'react';

import { cn } from '@shared/utils/cn';

import { Box, type BoxProps } from './box';

export function Container({ className, ...props }: BoxProps): ReactElement {
  return (
    <Box className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)} {...props} />
  );
}
