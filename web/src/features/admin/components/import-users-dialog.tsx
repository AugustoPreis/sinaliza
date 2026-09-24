import { Download, Upload, X } from 'lucide-react';
import { useId, useState, type ChangeEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/ui/dialog';
import { HStack, Stack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';
import { downloadBlob } from '@shared/utils/download-blob';

import { useImportUsersMutation } from '../queries/admin-users.queries';
import * as adminUsersService from '../services/admin-users.service';

export interface ImportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEMPLATE_FILENAME = 'modelo_usuarios_sinaliza.xlsx';

export function ImportUsersDialog({ open, onOpenChange }: ImportUsersDialogProps): ReactElement {
  const { t } = useTranslation('admin');
  const fileInputId = useId();
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [isDownloading, setIsDownloading] = useState(false);
  const importMutation = useImportUsersMutation();

  function handleOpenChange(nextOpen: boolean): void {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      setSelectedFile(undefined);
      importMutation.reset();
    }
  }

  async function handleDownloadTemplate(): Promise<void> {
    setIsDownloading(true);

    try {
      const blob = await adminUsersService.downloadImportTemplate();
      downloadBlob(blob, TEMPLATE_FILENAME);
    } catch (error) {
      toast.error(
        mapAxiosErrorToAppError(error as Parameters<typeof mapAxiosErrorToAppError>[0]).message,
      );
    } finally {
      setIsDownloading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setSelectedFile(event.target.files?.[0]);
    importMutation.reset();
  }

  function handleClearFile(): void {
    setSelectedFile(undefined);
    importMutation.reset();
  }

  function handleImport(): void {
    if (!selectedFile) {
      return;
    }

    importMutation.mutate(selectedFile, {
      onSuccess: (response) => {
        if (!response.success) {
          const message =
            response.details
              ?.map((detail) =>
                typeof detail?.message === 'string' ? detail.message : JSON.stringify(detail),
              )
              .join('\n') || t('usersImport.result.errorBadge');

          toast.error(message);

          setSelectedFile(undefined);
          importMutation.reset();
        }
      },
      onError: (error) => {
        toast.error(mapAxiosErrorToAppError(error).message);

        setSelectedFile(undefined);
        importMutation.reset();
      },
    });
  }

  const result = importMutation.data;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('usersImport.title')}</DialogTitle>
        </DialogHeader>

        <Stack gap={6}>
          <Text size="sm" tone="muted">
            {t('usersImport.description')}
          </Text>

          <Stack gap={2} className="rounded-lg border border-border p-4">
            <Text weight="medium" size="sm">
              {t('usersImport.templateStep.title')}
            </Text>
            <Text size="sm" tone="muted">
              {t('usersImport.templateStep.description')}
            </Text>
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => void handleDownloadTemplate()}
              disabled={isDownloading}
            >
              <Download size={16} aria-hidden="true" />
              {t('usersImport.templateStep.button')}
            </Button>
          </Stack>

          <Stack gap={2} className="rounded-lg border border-border p-4">
            <Text weight="medium" size="sm">
              {t('usersImport.uploadStep.title')}
            </Text>
            <Text size="sm" tone="muted">
              {t('usersImport.uploadStep.description')}
            </Text>

            {selectedFile ? (
              <HStack gap={3} align="center" className="w-full flex-nowrap">
                <HStack
                  gap={2}
                  align="center"
                  className="min-w-0 flex-1 rounded-md border border-border bg-muted/50 px-3 py-2"
                >
                  <Text size="sm" className="min-w-0 flex-1 truncate">
                    {selectedFile.name}
                  </Text>

                  <button
                    type="button"
                    onClick={handleClearFile}
                    aria-label={t('usersImport.uploadStep.removeFile')}
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </HStack>

                <Button
                  type="button"
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  className="shrink-0"
                >
                  <Upload size={16} aria-hidden="true" />
                  {t('usersImport.uploadStep.button')}
                </Button>
              </HStack>
            ) : (
              <Button type="button" variant="outline" asChild className="w-fit pt-2 cursor-pointer">
                <label htmlFor={fileInputId}>
                  <Upload size={16} aria-hidden="true" />
                  {t('usersImport.uploadStep.chooseFileButton')}
                </label>
              </Button>
            )}

            <input
              id={fileInputId}
              type="file"
              accept=".xlsx"
              className="sr-only"
              onChange={handleFileChange}
            />
          </Stack>

          {result?.success ? (
            <Stack gap={2} className="rounded-lg border border-border p-4">
              <Stack gap={1}>
                <Badge variant="success" className="w-fit">
                  {t('usersImport.result.successBadge')}
                </Badge>

                <Text size="sm">
                  {t('usersImport.result.summary', {
                    created: result.created,
                    updated: result.updated,
                  })}
                </Text>
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
