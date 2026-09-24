import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { SectorTicketListItemResponseDTOStatus } from '@core/api/generated/sinalizaAPI.schemas';
import { Badge, type BadgeProps } from '@shared/ui/badge';

// Brand mapping: ABERTO neutral, ENCAMINHADO info/blue, EM ANDAMENTO
// warning/amber, RESOLVIDO success/green.
const STATUS_VARIANTS: Record<SectorTicketListItemResponseDTOStatus, BadgeProps['variant']> = {
  OPEN: 'outline',
  FORWARDED: 'info',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
};

export interface TicketStatusBadgeProps {
  status: SectorTicketListItemResponseDTOStatus;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps): ReactElement {
  const { t } = useTranslation('tickets');

  return <Badge variant={STATUS_VARIANTS[status]}>{t(`status.${status}`)}</Badge>;
}
