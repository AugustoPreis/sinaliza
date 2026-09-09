import type { ReactElement } from 'react';

import { Heading, Text, type HeadingProps, type TextProps } from '@shared/ui/typography';
import { cn } from '@shared/utils/cn';

import { Box, type BoxProps } from './layout';

export type CardProps = BoxProps;

// Brand radius (16px, --radius-card) — distinct from the 10px controls use.
export function Card({ className, ...props }: CardProps): ReactElement {
  return (
    <Box
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-card text-card-foreground',
        className,
      )}
      {...props}
    />
  );
}

export type CardHeaderProps = BoxProps;

export function CardHeader({ className, ...props }: CardHeaderProps): ReactElement {
  return <Box className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />;
}

export type CardTitleProps = Omit<HeadingProps, 'level'>;

export function CardTitle({ className, ...props }: CardTitleProps): ReactElement {
  return <Heading level={3} size="sm" className={cn('leading-none', className)} {...props} />;
}

export type CardDescriptionProps = TextProps;

export function CardDescription({ className, ...props }: CardDescriptionProps): ReactElement {
  return <Text size="sm" tone="muted" className={className} {...props} />;
}

export type CardContentProps = BoxProps;

export function CardContent({ className, ...props }: CardContentProps): ReactElement {
  return <Box className={cn('p-6 pt-0', className)} {...props} />;
}

export type CardFooterProps = BoxProps;

export function CardFooter({ className, ...props }: CardFooterProps): ReactElement {
  return <Box className={cn('flex items-center p-6 pt-0', className)} {...props} />;
}
