import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { AdminTicketListItemResponseDTOStatus } from '@core/api/generated/sinalizaAPI.schemas';
import { Badge, type BadgeProps } from '@shared/ui/badge';

const STATUS_VARIANTS: Record<AdminTicketListItemResponseDTOStatus, BadgeProps['variant']> = {
  OPEN: 'secondary',
  FORWARDED: 'warning',
  IN_PROGRESS: 'default',
  RESOLVED: 'success',
};

export interface AdminTicketStatusBadgeProps {
  status: AdminTicketListItemResponseDTOStatus;
}

export function AdminTicketStatusBadge({ status }: AdminTicketStatusBadgeProps): ReactElement {
  const { t } = useTranslation('tickets');

  return <Badge variant={STATUS_VARIANTS[status]}>{t(`status.${status}`)}</Badge>;
}
