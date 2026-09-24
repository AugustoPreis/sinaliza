import { useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { TicketDetailResponseDTOStatus } from '@core/api/generated/sinalizaAPI.schemas';
import { Badge } from '@shared/ui/badge';
import { Container, Grid, HStack, Stack } from '@shared/ui/layout';
import { LoadingState } from '@shared/ui/loading-state';
import { NotFoundState } from '@shared/ui/not-found-state';
import { Heading, Text } from '@shared/ui/typography';

import { InternalNoteField } from '../components/internal-note-field';
import { ReassignTicketDialog } from '../components/reassign-ticket-dialog';
import { TicketStatusBadge } from '../components/ticket-status-badge';
import { TicketStatusControl } from '../components/ticket-status-control';
import { TicketTimeline } from '../components/ticket-timeline';
import { useTicketDetailQuery } from '../queries/tickets.queries';

export function TicketDetailPage(): ReactElement {
  const { t } = useTranslation('tickets');
  const { ticketId } = useParams({ from: '/_authenticated/tickets/$ticketId' });
  const ticketQuery = useTicketDetailQuery(ticketId);

  if (ticketQuery.isLoading) {
    return (
      <Container>
        <LoadingState message={t('detail.loading')} />
      </Container>
    );
  }

  const ticket = ticketQuery.data;

  if (!ticket) {
    return (
      <Container>
        <NotFoundState message={t('detail.notFound')} />
      </Container>
    );
  }

  const readOnly = ticket.status === TicketDetailResponseDTOStatus.RESOLVED;
  const classificationDiverged = ticket.automatic_sector.id !== ticket.confirmed_sector.id;

  return (
    <Container>
      <Stack gap={6}>
        <Stack gap={1}>
          <HStack align="center" gap={3} wrap>
            <Heading level={1}>{ticket.protocol}</Heading>
            <TicketStatusBadge status={ticket.status} />
          </HStack>
          <Text tone="muted" size="sm">
            {ticket.location.building.name} / {ticket.location.environment.name}
          </Text>
        </Stack>

        <Stack gap={2}>
          <Text weight="medium" size="sm">
            {t('detail.description')}
          </Text>
          <Text>{ticket.description}</Text>
        </Stack>

        {ticket.photos.length > 0 ? (
          <Stack gap={2}>
            <Text weight="medium" size="sm">
              {t('detail.photos')}
            </Text>
            <Grid columns={4} gap={2} className="grid-cols-2 sm:grid-cols-4">
              {ticket.photos.map((photo) => (
                <img
                  key={photo.id}
                  src={photo.url}
                  alt={t('detail.photoAlt', { protocol: ticket.protocol })}
                  className="aspect-square w-full rounded-md border border-border object-cover"
                />
              ))}
            </Grid>
          </Stack>
        ) : null}

        <Stack gap={2}>
          <Text weight="medium" size="sm">
            {t('detail.classification')}
          </Text>
          <HStack gap={2} align="center" wrap>
            <Text size="sm" tone="muted">
              {t('detail.automaticSector')}: {ticket.automatic_sector.name}
            </Text>
            <Text size="sm" tone="muted">
              {t('detail.confirmedSector')}: {ticket.confirmed_sector.name}
            </Text>
            {classificationDiverged ? (
              <Badge variant="warning">{t('detail.diverged')}</Badge>
            ) : null}
          </HStack>
          <Text size="sm" tone="muted">
            {t('detail.currentSector')}: {ticket.current_sector.name}
          </Text>
        </Stack>

        <HStack gap={2} wrap>
          <TicketStatusControl ticketId={ticket.id} status={ticket.status} />
          {!readOnly ? (
            <ReassignTicketDialog ticketId={ticket.id} currentSectorId={ticket.current_sector.id} />
          ) : null}
        </HStack>

        <InternalNoteField
          ticketId={ticket.id}
          initialNote={ticket.internal_note ?? null}
          readOnly={readOnly}
        />

        <Stack gap={2}>
          <Text weight="medium" size="sm">
            {t('detail.timeline.title')}
          </Text>
          <TicketTimeline events={ticket.timeline} />
        </Stack>
      </Stack>
    </Container>
  );
}
