import type { ReactElement, ReactNode } from 'react';

import { HStack, Stack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

export interface ISummaryRow {
  key: string;
  label: string;
  value: ReactNode;
}

export interface SummaryCardProps {
  title: string;
  rows: ISummaryRow[];
  footnote?: string;
}

export function SummaryCard({ title, rows, footnote }: SummaryCardProps): ReactElement {
  return (
    <Stack gap={3} className="rounded-lg border border-border p-4">
      <Text size="sm" weight="semibold" tone="muted" className="uppercase tracking-wide">
        {title}
      </Text>

      {rows.map((row) => (
        <HStack key={row.key} justify="between" align="center">
          <Text size="sm" tone="muted">
            {row.label}
          </Text>
          {typeof row.value === 'string' ? <Text size="sm">{row.value}</Text> : row.value}
        </HStack>
      ))}

      {footnote ? (
        <Text size="sm" tone="muted">
          {footnote}
        </Text>
      ) : null}
    </Stack>
  );
}
