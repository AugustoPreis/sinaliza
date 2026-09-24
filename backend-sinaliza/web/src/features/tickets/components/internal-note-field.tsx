import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Can } from '@core/auth/can';
import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { Button } from '@shared/ui/button';
import { Stack } from '@shared/ui/layout';
import { Textarea } from '@shared/ui/textarea';
import { Text } from '@shared/ui/typography';

import { useUpdateInternalNoteMutation } from '../queries/tickets.queries';

export interface InternalNoteFieldProps {
  ticketId: string;
  initialNote: string | null;
  readOnly: boolean;
}

export function InternalNoteField({
  ticketId,
  initialNote,
  readOnly,
}: InternalNoteFieldProps): ReactElement {
  const { t } = useTranslation('tickets');
  const [note, setNote] = useState(initialNote ?? '');
  const updateNoteMutation = useUpdateInternalNoteMutation(ticketId);

  function handleSave(): void {
    updateNoteMutation.mutate(
      { internal_note: note },
      {
        onSuccess: () => {
          toast.success(t('detail.internalNote.success'));
        },
        onError: (error) => {
          toast.error(mapAxiosErrorToAppError(error).message);
        },
      },
    );
  }

  return (
    <Can permission="tickets:internal-note">
      <Stack gap={2}>
        <Text weight="medium" size="sm">
          {t('detail.internalNote.label')}
        </Text>
        {readOnly ? (
          <Text size="sm" tone="muted">
            {note || t('detail.internalNote.empty')}
          </Text>
        ) : (
          <Stack gap={2}>
            <Textarea
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('detail.internalNote.placeholder')}
            />
            <Button
              type="button"
              size="sm"
              className="self-end"
              disabled={updateNoteMutation.isPending}
              onClick={handleSave}
            >
              {t('detail.internalNote.save')}
            </Button>
          </Stack>
        )}
      </Stack>
    </Can>
  );
}
