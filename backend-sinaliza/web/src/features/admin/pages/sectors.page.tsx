import { Info, Plus } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Can } from '@core/auth/can';
import { usePermissions } from '@core/auth/use-permissions.hook';
import { useDebounce } from '@shared/hooks/use-debounce.hook';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Container, HStack, Stack } from '@shared/ui/layout';
import { LoadingState } from '@shared/ui/loading-state';
import { Heading, Text } from '@shared/ui/typography';

import { SectorFormDialog } from '../components/sector-form-dialog';
import { SectorsTable } from '../components/sectors-table';
import { useAdminSectorsQuery } from '../queries/admin-sectors.queries';

export function AdminSectorsPage(): ReactElement {
  const { t } = useTranslation('admin');
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const sectorsQuery = useAdminSectorsQuery({ search: debouncedSearch || undefined });
  const items = sectorsQuery.data?.items ?? [];
  const canManage = hasPermission('sectors:manage');

  return (
    <Container size="wide">
      <Stack gap={6}>
        <HStack align="center" justify="between" wrap gap={4}>
          <Heading level={1}>{t('sectors.title')}</Heading>
          <Can permission="sectors:manage">
            <Button type="button" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              {t('sectors.createButton')}
            </Button>
          </Can>
        </HStack>

        {!canManage ? (
          <HStack
            gap={3}
            align="start"
            className="rounded-[var(--radius-card)] border border-border bg-muted px-4 py-3"
          >
            <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />
            <Text size="sm" tone="muted">
              {t('sectors.readOnlyNotice')}
            </Text>
          </HStack>
        ) : null}

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('sectors.searchPlaceholder')}
          className="max-w-sm"
        />

        {sectorsQuery.isLoading ? (
          <LoadingState message={t('sectors.loading')} />
        ) : (
          <SectorsTable items={items} />
        )}
      </Stack>

      <SectorFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </Container>
  );
}
