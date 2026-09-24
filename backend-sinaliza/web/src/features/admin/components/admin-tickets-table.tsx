import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { AdminTicketListItemResponseDTO } from '@core/api/generated/sinalizaAPI.schemas';
import { DataTable, type IDataTableColumn } from '@shared/ui/data-table';
import { Text } from '@shared/ui/typography';
import { formatDateTime } from '@shared/utils/format-date-time';

import { AdminTicketStatusBadge } from './admin-ticket-status-badge';

export interface AdminTicketsTableProps {
  items: AdminTicketListItemResponseDTO[];
  onRowClick: (ticket: AdminTicketListItemResponseDTO) => void;
}

export function AdminTicketsTable({ items, onRowClick }: AdminTicketsTableProps): ReactElement {
  const { t } = useTranslation('admin');

  const columns: IDataTableColumn<AdminTicketListItemResponseDTO>[] = [
    {
      key: 'protocol',
      header: t('dashboard.table.protocol'),
      cell: (row) => (
        <Text weight="medium" size="sm">
          {row.protocol}
        </Text>
      ),
    },
    {
      key: 'description',
      header: t('dashboard.table.description'),
      cell: (row) => (
        <Text size="sm" className="max-w-sm truncate">
          {row.description_summary}
        </Text>
      ),
    },
    {
      key: 'sector',
      header: t('dashboard.table.sector'),
      cell: (row) => (
        <Text size="sm" tone="muted">
          {row.current_sector.name}
        </Text>
      ),
    },
    {
      key: 'status',
      header: t('dashboard.table.status'),
      cell: (row) => <AdminTicketStatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: t('dashboard.table.createdAt'),
      cell: (row) => (
        <Text size="sm" tone="muted">
          {formatDateTime(row.created_at)}
        </Text>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowKey={(row) => row.id}
      onRowClick={onRowClick}
      emptyMessage={t('dashboard.table.empty')}
    />
  );
}
