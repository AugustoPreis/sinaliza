import type { ComponentPropsWithoutRef, ReactElement } from 'react';

import { Box } from '@shared/ui/layout';
import { cn } from '@shared/utils/cn';

export type TableProps = ComponentPropsWithoutRef<'table'>;

export function Table({ className, ...props }: TableProps): ReactElement {
  return (
    <Box className="w-full overflow-x-auto rounded-md border border-border">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </Box>
  );
}

export type TableHeaderProps = ComponentPropsWithoutRef<'thead'>;

export function TableHeader({ className, ...props }: TableHeaderProps): ReactElement {
  return <thead className={cn('bg-muted/50', className)} {...props} />;
}

export type TableBodyProps = ComponentPropsWithoutRef<'tbody'>;

export function TableBody({ className, ...props }: TableBodyProps): ReactElement {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export type TableRowProps = ComponentPropsWithoutRef<'tr'>;

export function TableRow({ className, ...props }: TableRowProps): ReactElement {
  return <tr className={cn('transition-colors hover:bg-muted/40', className)} {...props} />;
}

export type TableHeadProps = ComponentPropsWithoutRef<'th'>;

export function TableHead({ className, ...props }: TableHeadProps): ReactElement {
  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export type TableCellProps = ComponentPropsWithoutRef<'td'>;

export function TableCell({ className, ...props }: TableCellProps): ReactElement {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}
