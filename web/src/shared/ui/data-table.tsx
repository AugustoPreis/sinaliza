import type { ReactElement, ReactNode } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { cn } from '@shared/utils/cn';

export interface IDataTableColumn<TRow> {
  key: string;
  header: ReactNode;
  cell: (row: TRow) => ReactNode;
  className?: string;
}

export interface DataTableProps<TRow> {
  columns: IDataTableColumn<TRow>[];
  data: TRow[];
  getRowKey: (row: TRow) => string;
  emptyMessage: ReactNode;
  onRowClick?: (row: TRow) => void;
}

export function DataTable<TRow>({
  columns,
  data,
  getRowKey,
  emptyMessage,
  onRowClick,
}: DataTableProps<TRow>): ReactElement {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length}>{emptyMessage}</TableCell>
          </TableRow>
        ) : (
          data.map((row) => (
            <TableRow
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
