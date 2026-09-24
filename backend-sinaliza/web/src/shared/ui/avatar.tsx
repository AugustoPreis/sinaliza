import * as AvatarPrimitive from '@radix-ui/react-avatar';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { cn } from '@shared/utils/cn';

export type AvatarProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>;

export function Avatar({ className, ...props }: AvatarProps): ReactElement {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex size-9 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
}

export type AvatarImageProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>;

export function AvatarImage({ className, ...props }: AvatarImageProps): ReactElement {
  return <AvatarPrimitive.Image className={cn('aspect-square size-full', className)} {...props} />;
}

export type AvatarFallbackProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>;

export function AvatarFallback({ className, ...props }: AvatarFallbackProps): ReactElement {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
