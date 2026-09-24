import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { AdminDashboardSummaryDTO } from '@core/api/generated/sinalizaAPI.schemas';
import { Card, CardContent, CardDescription } from '@shared/ui/card';
import { Grid } from '@shared/ui/layout';
import { Heading } from '@shared/ui/typography';

export interface AdminDashboardSummaryCardsProps {
  summary: AdminDashboardSummaryDTO;
}

export function AdminDashboardSummaryCards({
  summary,
}: AdminDashboardSummaryCardsProps): ReactElement {
  const { t } = useTranslation('admin');

  const cards = [
    { key: 'volume', label: t('dashboard.summary.volume'), value: summary.volume.toString() },
    {
      key: 'resolvedPercentage',
      label: t('dashboard.summary.resolvedPercentage'),
      value: `${summary.resolved_percentage.toFixed(1)}%`,
    },
    {
      key: 'averageTime',
      label: t('dashboard.summary.averageTime'),
      value: t('dashboard.summary.minutes', {
        count: Math.round(summary.average_time_to_correct_sector_minutes),
      }),
    },
  ];

  return (
    <Grid columns={3} gap={4} className="grid-cols-1 sm:grid-cols-3">
      {cards.map((card) => (
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
  );
}
