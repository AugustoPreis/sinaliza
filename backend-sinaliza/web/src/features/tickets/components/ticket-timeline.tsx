import {
  ArrowRightLeft,
  CheckCircle2,
  CircleDot,
  RefreshCw,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { ComponentType, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import {
  TicketTimelineEventDTOType,
  type TicketTimelineEventDTO,
} from '@core/api/generated/sinalizaAPI.schemas';
import { HStack, Stack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

const EVENT_ICONS: Record<TicketTimelineEventDTO['type'], ComponentType<{ size?: number }>> = {
  [TicketTimelineEventDTOType.TICKET_OPENED]: CircleDot,
  [TicketTimelineEventDTOType.AUTO_CLASSIFIED]: Sparkles,
  [TicketTimelineEventDTOType.REQUESTER_CONFIRMED_SECTOR]: UserCheck,
  [TicketTimelineEventDTOType.REQUESTER_CHANGED_SECTOR]: RefreshCw,
  [TicketTimelineEventDTOType.STATUS_CHANGED]: RefreshCw,
  [TicketTimelineEventDTOType.REASSIGNED]: ArrowRightLeft,
  [TicketTimelineEventDTOType.TICKET_RESOLVED]: CheckCircle2,
};

export interface TicketTimelineProps {
  events: TicketTimelineEventDTO[];
}

export function TicketTimeline({ events }: TicketTimelineProps): ReactElement {
  const { t } = useTranslation('tickets');

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (sortedEvents.length === 0) {
    return (
      <Text size="sm" tone="muted">
        {t('detail.timeline.empty')}
      </Text>
    );
  }

  return (
    <Stack gap={4}>
      {sortedEvents.map((event, index) => {
        const Icon = EVENT_ICONS[event.type];

        return (
          <HStack key={`${event.type}-${event.created_at}-${index}`} gap={3} align="start">
            <Stack className="mt-0.5 shrink-0 text-muted-foreground">
              <Icon size={16} />
            </Stack>
            <Stack gap={1}>
              <Text size="sm">{event.description}</Text>
              <Text size="sm" tone="muted">
                {new Date(event.created_at).toLocaleString('pt-BR')}
              </Text>
            </Stack>
          </HStack>
        );
      })}
    </Stack>
  );
}
