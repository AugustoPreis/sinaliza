import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '@shared/utils/cn';

const textVariants = cva('', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      destructive: 'text-destructive',
    },
  },
  defaultVariants: {
    size: 'md',
    weight: 'normal',
    tone: 'default',
  },
});

export interface TextProps
  extends ComponentPropsWithoutRef<'p'>, VariantProps<typeof textVariants> {}

export function Text({ size, weight, tone, className, ...props }: TextProps): ReactElement {
  return <p className={cn(textVariants({ size, weight, tone }), className)} {...props} />;
}
