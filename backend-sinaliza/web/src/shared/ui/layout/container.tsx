import type { ReactElement } from 'react';

import { cn } from '@shared/utils/cn';

import { Box, type BoxProps } from './box';

export interface ContainerProps extends BoxProps {
  // 'default' (max-w-6xl) fits forms/detail screens; 'wide' (max-w-screen-2xl)
  // is for listing screens, which were cramping a lot of tabular/filter UI
  // into the narrower width.
  size?: 'default' | 'wide';
}

const SIZE_CLASSES: Record<NonNullable<ContainerProps['size']>, string> = {
  default: 'max-w-6xl',
  wide: 'max-w-screen-2xl',
};

export function Container({ className, size = 'default', ...props }: ContainerProps): ReactElement {
  return (
    <Box
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', SIZE_CLASSES[size], className)}
      {...props}
    />
  );
}
