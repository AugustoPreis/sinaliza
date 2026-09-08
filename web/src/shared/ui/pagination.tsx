import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/button';
import { HStack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

// Structurally compatible with (but not importing) the API's
// PaginationMetaDTO, so this primitive stays free of any dependency on
// core/ — shared/ cannot depend on core/.
export interface IPaginationMeta {
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
}

export interface PaginationProps {
  meta: IPaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps): ReactElement | null {
  const { t } = useTranslation();

  if (meta.total === 0) {
    return null;
  }

  const canGoPrevious = meta.page > 1;
  const canGoNext = meta.page < meta.lastPage;

  return (
    <HStack align="center" justify="between" wrap>
      <Text size="sm" tone="muted">
        {t('pagination.summary', {
          page: meta.page,
          lastPage: meta.lastPage,
          total: meta.total,
        })}
      </Text>
      <HStack gap={2}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canGoPrevious}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {t('pagination.previous')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canGoNext}
          onClick={() => onPageChange(meta.page + 1)}
        >
          {t('pagination.next')}
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </HStack>
    </HStack>
  );
}
