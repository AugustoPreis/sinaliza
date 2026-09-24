import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { Box } from '@shared/ui/layout';
import { cn } from '@shared/utils/cn';

export type CommandProps = ComponentPropsWithoutRef<typeof CommandPrimitive>;

export function Command({ className, ...props }: CommandProps): ReactElement {
  return (
    <CommandPrimitive
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
        className,
      )}
      {...props}
    />
  );
}

export type CommandInputProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Input>;

export function CommandInput({ className, ...props }: CommandInputProps): ReactElement {
  return (
    <Box className="flex h-9 items-center gap-2 border-b border-border px-3">
      <Search size={16} aria-hidden="true" className="shrink-0 opacity-50" />
      <CommandPrimitive.Input
        className={cn(
          'flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </Box>
  );
}

export type CommandListProps = ComponentPropsWithoutRef<typeof CommandPrimitive.List>;

export function CommandList({ className, ...props }: CommandListProps): ReactElement {
  return (
    <CommandPrimitive.List
      className={cn('max-h-64 overflow-y-auto overflow-x-hidden p-1', className)}
      {...props}
    />
  );
}

export type CommandEmptyProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>;

export function CommandEmpty({ className, ...props }: CommandEmptyProps): ReactElement {
  return (
    <CommandPrimitive.Empty
      className={cn('py-6 text-center text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export type CommandGroupProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Group>;

export function CommandGroup({ className, ...props }: CommandGroupProps): ReactElement {
  return (
    <CommandPrimitive.Group
      className={cn('overflow-hidden text-foreground', className)}
      {...props}
    />
  );
}

export type CommandItemProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Item>;

export function CommandItem({ className, ...props }: CommandItemProps): ReactElement {
  return (
    <CommandPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
