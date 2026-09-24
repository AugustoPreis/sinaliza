import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  UpdateTicketStatusDTOStatus,
  type TicketDetailResponseDTOStatus,
  type UpdateTicketStatusDTOStatus as TStatusTransition,
} from '@core/api/generated/sinalizaAPI.schemas';
import { Can } from '@core/auth/can';
import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { Button } from '@shared/ui/button';
import { HStack } from '@shared/ui/layout';

import { useUpdateTicketStatusMutation } from '../queries/tickets.queries';

const STATUS_TRANSITIONS: Record<TicketDetailResponseDTOStatus, TStatusTransition[]> = {
  OPEN: [UpdateTicketStatusDTOStatus.IN_PROGRESS],
  FORWARDED: [UpdateTicketStatusDTOStatus.IN_PROGRESS],
  IN_PROGRESS: [UpdateTicketStatusDTOStatus.RESOLVED],
  RESOLVED: [],
};

export interface TicketStatusControlProps {
  ticketId: string;
  status: TicketDetailResponseDTOStatus;
}

export function TicketStatusControl({
  ticketId,
  status,
}: TicketStatusControlProps): ReactElement | null {
  const { t } = useTranslation('tickets');
  const updateStatusMutation = useUpdateTicketStatusMutation(ticketId);

  const availableTransitions = STATUS_TRANSITIONS[status];

  if (availableTransitions.length === 0) {
    return null;
  }

  function handleTransition(nextStatus: TStatusTransition): void {
    updateStatusMutation.mutate(
      { status: nextStatus },
      {
        onSuccess: () => {
          toast.success(t('detail.status.success'));
        },
        onError: (error) => {
          toast.error(mapAxiosErrorToAppError(error).message);
        },
      },
    );
  }

  return (
    <Can permission="tickets:update-status">
      <HStack gap={2}>
        {availableTransitions.map((nextStatus) => (
          <Button
            key={nextStatus}
            type="button"
            disabled={updateStatusMutation.isPending}
            onClick={() => handleTransition(nextStatus)}
          >
            {t(`detail.status.action.${nextStatus}`)}
          </Button>
        ))}
      </HStack>
    </Can>
  );
}
