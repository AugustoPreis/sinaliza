import { Pencil } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Can } from '@core/auth/can';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { DataTable, type IDataTableColumn } from '@shared/ui/data-table';
import { HStack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

import type { IAdminSector } from '../services/admin-sectors.service';

import { SectorFormDialog } from './sector-form-dialog';

export interface SectorsTableProps {
  items: IAdminSector[];
}

export function SectorsTable({ items }: SectorsTableProps): ReactElement {
  const { t } = useTranslation('admin');
  const [editingSector, setEditingSector] = useState<IAdminSector | undefined>(undefined);

  const columns: IDataTableColumn<IAdminSector>[] = [
    {
      key: 'name',
      header: t('sectors.table.name'),
      cell: (row) => (
        <Text weight="medium" size="sm">
          {row.name}
        </Text>
      ),
    },
    {
      key: 'categories',
      header: t('sectors.table.categories'),
      cell: (row) => (
        <HStack gap={1} wrap>
          {row.categories.map((category) => (
            <Badge key={category} variant="secondary">
              {category}
            </Badge>
          ))}
        </HStack>
      ),
    },
    {
      key: 'responsibleUsers',
      header: t('sectors.table.responsibleUsers'),
      cell: (row) => (
        <Text size="sm" tone="muted">
          {row.responsible_users.map((user) => user.name).join(', ') ||
            t('sectors.table.noResponsibleUsers')}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <Can permission="sectors:manage">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditingSector(row)}
          >
            <Pencil size={16} aria-hidden="true" />
            {t('sectors.table.edit')}
          </Button>
        </Can>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        getRowKey={(row) => row.id}
        emptyMessage={t('sectors.table.empty')}
      />

      {editingSector ? (
        <SectorFormDialog
          open={Boolean(editingSector)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingSector(undefined);
            }
          }}
          sector={editingSector}
        />
      ) : null}
    </>
  );
}
