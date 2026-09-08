import type { ReactElement } from 'react';

import { cn } from '@shared/utils/cn';

import { Box, type BoxProps } from './box';
import { GAP_CLASSES, type Gap } from './gap';

const ALIGN_CLASSES = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const;

export type StackAlign = keyof typeof ALIGN_CLASSES;

const JUSTIFY_CLASSES = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
} as const;

export type StackJustify = keyof typeof JUSTIFY_CLASSES;

export interface StackProps extends BoxProps {
  direction?: 'row' | 'column';
  gap?: Gap;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
}

export function Stack({
  direction = 'column',
  gap = 0,
  align,
  justify,
  wrap,
  className,
  ...props
}: StackProps): ReactElement {
  return (
    <Box
      className={cn(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        GAP_CLASSES[gap],
        align && ALIGN_CLASSES[align],
        justify && JUSTIFY_CLASSES[justify],
        wrap && 'flex-wrap',
        className,
      )}
      {...props}
    />
  );
}

export function HStack(props: Omit<StackProps, 'direction'>): ReactElement {
  return <Stack {...props} direction="row" />;
}

export function VStack(props: Omit<StackProps, 'direction'>): ReactElement {
  return <Stack {...props} direction="column" />;
}
