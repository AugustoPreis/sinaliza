import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { ResearchIndicatorsResponseDTO } from '@core/api/generated/sinalizaAPI.schemas';
import { Card, CardContent, CardDescription } from '@shared/ui/card';
import { DataTable, type IDataTableColumn } from '@shared/ui/data-table';
import { Grid, Stack } from '@shared/ui/layout';
import { Heading, Text } from '@shared/ui/typography';

export interface ResearchIndicatorsViewProps {
  indicators: ResearchIndicatorsResponseDTO;
}

export function ResearchIndicatorsView({ indicators }: ResearchIndicatorsViewProps): ReactElement {
  const { t } = useTranslation('admin');

  const summaryCards = [
    {
      key: 'automaticAccuracy',
      label: t('research.summary.automaticAccuracy'),
      value: `${indicators.automatic_accuracy.percentage.toFixed(1)}%`,
    },
    {
      key: 'correctionsByRequester',
      label: t('research.summary.correctionsByRequester'),
      value: indicators.corrections.by_requester.toString(),
    },
    {
      key: 'correctionsBySector',
      label: t('research.summary.correctionsBySector'),
      value: indicators.corrections.by_sector.toString(),
    },
    {
      key: 'averageTime',
      label: t('research.summary.averageTime'),
      value: t('research.summary.minutes', {
        count: Math.round(indicators.time_to_correct_sector.average_minutes),
      }),
    },
    {
      key: 'medianTime',
      label: t('research.summary.medianTime'),
      value: t('research.summary.minutes', {
        count: Math.round(indicators.time_to_correct_sector.median_minutes),
      }),
    },
  ];

  const sectorColumns: IDataTableColumn<(typeof indicators.volume.by_sector)[number]>[] = [
    {
      key: 'sector',
      header: t('research.volume.sector'),
      cell: (row) => <Text size="sm">{row.sector_name}</Text>,
    },
    {
      key: 'count',
      header: t('research.volume.count'),
      className: 'w-px whitespace-nowrap text-center',
      cell: (row) => (
        <Text size="sm" className="text-center">
          {row.count}
        </Text>
      ),
    },
  ];

  const categoryColumns: IDataTableColumn<(typeof indicators.volume.by_category)[number]>[] = [
    {
      key: 'category',
      header: t('research.volume.category'),
      cell: (row) => <Text size="sm">{row.category}</Text>,
    },
    {
      key: 'count',
      header: t('research.volume.count'),
      className: 'w-px whitespace-nowrap text-center',
      cell: (row) => (
        <Text size="sm" className="text-center">
          {row.count}
        </Text>
      ),
    },
  ];

  const locationColumns: IDataTableColumn<(typeof indicators.volume.by_location)[number]>[] = [
    {
      key: 'building',
      header: t('research.volume.building'),
      cell: (row) => <Text size="sm">{row.building_name}</Text>,
    },
    {
      key: 'count',
      header: t('research.volume.count'),
      className: 'w-px whitespace-nowrap text-center',
      cell: (row) => (
        <Text size="sm" className="text-center">
          {row.count}
        </Text>
      ),
    },
  ];

  return (
    <Stack gap={8}>
      {/* 5 cards: 3 + 2 layout on lg. Adding/removing a card changes this. */}
      <Grid gap={4} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.key}>
            <CardContent className="flex flex-col gap-2 p-6">
              <CardDescription>{card.label}</CardDescription>
              <Heading level={2} size="lg">
                {card.value}
              </Heading>
            </CardContent>
          </Card>
        ))}
      </Grid>

      <Grid columns={3} gap={6} className="grid-cols-1 lg:grid-cols-3">
        <Stack gap={2}>
          <Text weight="medium" size="sm">
            {t('research.volume.bySector')}
          </Text>
          <DataTable
            columns={sectorColumns}
            data={indicators.volume.by_sector}
            getRowKey={(row) => row.sector_id}
            emptyMessage={t('research.volume.empty')}
          />
        </Stack>

        <Stack gap={2}>
          <Text weight="medium" size="sm">
            {t('research.volume.byCategory')}
          </Text>
          <DataTable
            columns={categoryColumns}
            data={indicators.volume.by_category}
            getRowKey={(row) => row.category}
            emptyMessage={t('research.volume.empty')}
          />
        </Stack>

        <Stack gap={2}>
          <Text weight="medium" size="sm">
            {t('research.volume.byLocation')}
          </Text>
          <DataTable
            columns={locationColumns}
            data={indicators.volume.by_location}
            getRowKey={(row) => row.building_id}
            emptyMessage={t('research.volume.empty')}
          />
        </Stack>
      </Grid>
    </Stack>
  );
}
