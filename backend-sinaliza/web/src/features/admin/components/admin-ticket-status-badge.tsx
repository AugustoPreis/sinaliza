import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { AdminTicketListItemResponseDTOStatus } from '@core/api/generated/sinalizaAPI.schemas';
import { Badge, type BadgeProps } from '@shared/ui/badge';

// Brand mapping: ABERTO neutral, ENCAMINHADO info/blue, EM ANDAMENTO
// warning/amber, RESOLVIDO success/green.
const STATUS_VARIANTS: Record<AdminTicketListItemResponseDTOStatus, BadgeProps['variant']> = {
  OPEN: 'outline',
  FORWARDED: 'info',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
};

export interface AdminTicketStatusBadgeProps {
  status: AdminTicketListItemResponseDTOStatus;
}

export function AdminTicketStatusBadge({ status }: AdminTicketStatusBadgeProps): ReactElement {
  const { t } = useTranslation('tickets');

  return <Badge variant={STATUS_VARIANTS[status]}>{t(`status.${status}`)}</Badge>;
}
