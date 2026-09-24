import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '@shared/utils/cn';

const headingVariants = cva('tracking-tight', {
  variants: {
    size: {
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-2xl',
      xl: 'text-3xl',
      '2xl': 'text-4xl',
    },
    weight: {
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    weight: 'semibold',
    tone: 'default',
  },
});

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingSize = NonNullable<VariantProps<typeof headingVariants>['size']>;

const LEVEL_DEFAULT_SIZE: Record<HeadingLevel, HeadingSize> = {
  1: '2xl',
  2: 'xl',
  3: 'lg',
  4: 'md',
  5: 'sm',
  6: 'sm',
};

export interface HeadingProps
  extends Omit<ComponentPropsWithoutRef<'h1'>, 'className'>, VariantProps<typeof headingVariants> {
  level?: HeadingLevel;
  className?: string;
}

export function Heading({
  level = 2,
  size,
  weight,
  tone,
  className,
  ...props
}: HeadingProps): ReactElement {
  const Tag = `h${level}` as const;

  return (
    <Tag
      className={cn(
        headingVariants({ size: size ?? LEVEL_DEFAULT_SIZE[level], weight, tone }),
        className,
      )}
      {...props}
    />
  );
}
