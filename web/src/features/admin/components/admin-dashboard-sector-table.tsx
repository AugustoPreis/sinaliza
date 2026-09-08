import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { AdminDashboardSectorRowDTO } from '@core/api/generated/sinalizaAPI.schemas';
import { DataTable, type IDataTableColumn } from '@shared/ui/data-table';
import { Text } from '@shared/ui/typography';

export interface AdminDashboardSectorTableProps {
  rows: AdminDashboardSectorRowDTO[];
}

export function AdminDashboardSectorTable({ rows }: AdminDashboardSectorTableProps): ReactElement {
  const { t } = useTranslation('admin');

  const columns: IDataTableColumn<AdminDashboardSectorRowDTO>[] = [
    {
      key: 'sector',
      header: t('dashboard.bySector.sector'),
      cell: (row) => (
        <Text weight="medium" size="sm">
          {row.sector_name}
        </Text>
      ),
    },
    {
      key: 'forwarded',
      header: t('dashboard.bySector.forwarded'),
      cell: (row) => <Text size="sm">{row.forwarded}</Text>,
    },
    {
      key: 'inProgress',
      header: t('dashboard.bySector.inProgress'),
      cell: (row) => <Text size="sm">{row.in_progress}</Text>,
    },
    {
      key: 'resolved',
      header: t('dashboard.bySector.resolved'),
      cell: (row) => <Text size="sm">{row.resolved}</Text>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(row) => row.sector_id}
      emptyMessage={t('dashboard.bySector.empty')}
    />
  );
}
