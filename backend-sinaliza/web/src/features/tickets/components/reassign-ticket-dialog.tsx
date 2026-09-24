import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightLeft } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Can } from '@core/auth/can';
import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { Button } from '@shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@shared/ui/dialog';
import { FormField } from '@shared/ui/form';
import { Stack } from '@shared/ui/layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';

import { useSectorsQuery } from '../queries/sectors.queries';
import { useReassignTicketMutation } from '../queries/tickets.queries';
import {
  reassignTicketSchema,
  type ReassignTicketFormValues,
} from '../schemas/reassign-ticket.schema';

export interface ReassignTicketDialogProps {
  ticketId: string;
  currentSectorId: string;
}

export function ReassignTicketDialog({
  ticketId,
  currentSectorId,
}: ReassignTicketDialogProps): ReactElement {
  const { t } = useTranslation('tickets');
  const [open, setOpen] = useState(false);
  const sectorsQuery = useSectorsQuery();
  const reassignMutation = useReassignTicketMutation(ticketId);

  const targetSectors = (sectorsQuery.data?.items ?? []).filter(
    (sector) => sector.id !== currentSectorId,
  );

  const form = useForm<ReassignTicketFormValues>({
    resolver: zodResolver(reassignTicketSchema),
    defaultValues: { target_sector_id: '', reason: '' },
  });

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);

    if (!nextOpen) {
      form.reset();
    }
  }

  function onSubmit(values: ReassignTicketFormValues): void {
    reassignMutation.mutate(values, {
      onSuccess: () => {
        toast.success(t('detail.reassign.success'));
        handleOpenChange(false);
      },
      onError: (error) => {
        toast.error(mapAxiosErrorToAppError(error).message);
      },
    });
  }

  return (
    <Can permission="tickets:reassign">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <ArrowRightLeft size={16} aria-hidden="true" />
            {t('detail.reassign.trigger')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.reassign.title')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Stack gap={4}>
              <FormField
                control={form.control}
                name="target_sector_id"
                label={t('detail.reassign.targetSectorLabel')}
                render={(field) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={field.id} aria-invalid={field['aria-invalid']}>
                      <SelectValue placeholder={t('detail.reassign.targetSectorPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {targetSectors.map((sector) => (
                        <SelectItem key={sector.id} value={sector.id}>
                          {sector.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                label={t('detail.reassign.reasonLabel')}
                render={(field) => <Textarea rows={4} {...field} />}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={reassignMutation.isPending}
                >
                  {t('detail.reassign.cancel')}
                </Button>
                <Button type="submit" disabled={reassignMutation.isPending}>
                  {t('detail.reassign.confirm')}
                </Button>
              </DialogFooter>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>
    </Can>
  );
}
