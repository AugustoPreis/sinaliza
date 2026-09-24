import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, type BoxProps } from '@shared/ui/layout';
import { cn } from '@shared/utils/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;

export type SheetContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content>;

export function SheetContent({ className, children, ...props }: SheetContentProps): ReactElement {
  const { t } = useTranslation();

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex h-full w-3/4 max-w-xs flex-col gap-4 border-l border-border bg-background p-6 shadow-lg sm:max-w-sm',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={t('actions.close')}
        >
          <X size={16} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export type SheetHeaderProps = BoxProps;

export function SheetHeader({ className, ...props }: SheetHeaderProps): ReactElement {
  return <Box className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

export type SheetTitleProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;

export function SheetTitle({ className, ...props }: SheetTitleProps): ReactElement {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold text-foreground', className)}
      {...props}
    />
  );
}
