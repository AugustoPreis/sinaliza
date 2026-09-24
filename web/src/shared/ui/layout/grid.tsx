import type { ReactElement } from 'react';

import { cn } from '@shared/utils/cn';

import { Box, type BoxProps } from './box';
import { GAP_CLASSES, type Gap } from './gap';

const COLUMN_CLASSES = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
} as const;

export type GridColumns = keyof typeof COLUMN_CLASSES;

export interface GridProps extends BoxProps {
  columns?: GridColumns;
  gap?: Gap;
}

export function Grid({ columns = 1, gap = 0, className, ...props }: GridProps): ReactElement {
  return (
    <Box className={cn('grid', COLUMN_CLASSES[columns], GAP_CLASSES[gap], className)} {...props} />
  );
}

const SPAN_CLASSES = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  6: 'col-span-6',
  12: 'col-span-12',
  full: 'col-span-full',
} as const;

export type GridItemSpan = keyof typeof SPAN_CLASSES;

export interface GridItemProps extends BoxProps {
  span?: GridItemSpan;
}

export function GridItem({ span, className, ...props }: GridItemProps): ReactElement {
  return <Box className={cn(span && SPAN_CLASSES[span], className)} {...props} />;
}
