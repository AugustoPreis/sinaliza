import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { Box } from '@shared/ui/layout';
import { cn } from '@shared/utils/cn';

const badgeVariants = cva(
  'inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success: 'border-transparent bg-emerald-600/15 text-emerald-500',
        warning: 'border-transparent bg-amber-600/15 text-amber-500',
        destructive: 'border-transparent bg-destructive/15 text-destructive',
        outline: 'border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends ComponentPropsWithoutRef<'div'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): ReactElement {
  return <Box className={cn(badgeVariants({ variant }), className)} {...props} />;
}
