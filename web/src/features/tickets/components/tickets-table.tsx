import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { SectorTicketListItemResponseDTO } from '@core/api/generated/sinalizaAPI.schemas';
import { Badge } from '@shared/ui/badge';
import { DataTable, type IDataTableColumn } from '@shared/ui/data-table';
import { HStack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

import { TicketStatusBadge } from './ticket-status-badge';

export interface TicketsTableProps {
  items: SectorTicketListItemResponseDTO[];
  onRowClick: (ticket: SectorTicketListItemResponseDTO) => void;
}

export function TicketsTable({ items, onRowClick }: TicketsTableProps): ReactElement {
  const { t } = useTranslation('tickets');

  const columns: IDataTableColumn<SectorTicketListItemResponseDTO>[] = [
    {
      key: 'protocol',
      header: t('table.protocol'),
      cell: (row) => (
        <Text weight="medium" size="sm">
          {row.protocol}
        </Text>
      ),
    },
    {
      key: 'description',
      header: t('table.description'),
      cell: (row) => (
        <Text size="sm" className="max-w-sm truncate">
          {row.description_summary}
        </Text>
      ),
    },
    {
      key: 'location',
      header: t('table.location'),
      cell: (row) => (
        <Text size="sm" tone="muted">
          {row.location}
        </Text>
      ),
    },
    {
      key: 'status',
      header: t('table.status'),
      cell: (row) => <TicketStatusBadge status={row.status} />,
    },
    {
      key: 'divergence',
      header: t('table.divergence'),
      cell: (row) =>
        row.classification_diverged ? (
          <HStack align="center" gap={1}>
            <Badge variant="warning">
              <AlertTriangle size={12} aria-hidden="true" />
              {t('table.diverged')}
            </Badge>
          </HStack>
        ) : null,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowKey={(row) => row.id}
      onRowClick={onRowClick}
      emptyMessage={t('table.empty')}
    />
  );
}
