import { Download, Upload } from 'lucide-react';
import { useState, type ChangeEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { FileInput } from '@shared/ui/file-input';
import { Container, Stack } from '@shared/ui/layout';
import { Heading, Text } from '@shared/ui/typography';
import { downloadBlob } from '@shared/utils/download-blob';

import { useImportUsersMutation } from '../queries/admin-users.queries';
import * as adminUsersService from '../services/admin-users.service';

const TEMPLATE_FILENAME = 'modelo_usuarios_sinaliza.xlsx';

export function AdminUsersImportPage(): ReactElement {
  const { t } = useTranslation('admin');
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [isDownloading, setIsDownloading] = useState(false);
  const importMutation = useImportUsersMutation();

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

  function handleImport(): void {
    if (!selectedFile) {
      return;
    }

    importMutation.mutate(selectedFile, {
      onError: (error) => {
        toast.error(mapAxiosErrorToAppError(error).message);
      },
    });
  }

  const result = importMutation.data;

  return (
    <Container>
      <Stack gap={6} className="max-w-2xl">
        <Stack gap={1}>
          <Heading level={1}>{t('usersImport.title')}</Heading>
          <Text size="sm" tone="muted">
            {t('usersImport.description')}
          </Text>
        </Stack>

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

          <FileInput
            accept=".xlsx"
            onChange={handleFileChange}
            buttonLabel={t('usersImport.uploadStep.chooseFileButton')}
            noFileLabel={t('usersImport.uploadStep.noFileChosen')}
          />

          <Button
            type="button"
            className="w-fit"
            onClick={handleImport}
            disabled={!selectedFile || importMutation.isPending}
          >
            <Upload size={16} aria-hidden="true" />
            {t('usersImport.uploadStep.button')}
          </Button>
        </Stack>

        {result ? (
          <Stack gap={2} className="rounded-lg border border-border p-4">
            {result.success ? (
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
            ) : (
              <Stack gap={1}>
                <Badge variant="destructive" className="w-fit">
                  {t('usersImport.result.errorBadge')}
                </Badge>
                <Text size="sm">{result.error ?? t('usersImport.result.genericError')}</Text>
                <Text size="sm" tone="muted">
                  {t('usersImport.result.atomicNote')}
                </Text>
                {result.details && result.details.length > 0 ? (
                  <Stack gap={1} className="rounded-md bg-muted p-2">
                    {result.details.map((detail, index) => (
                      <Text
                        key={`${index}-${JSON.stringify(detail)}`}
                        size="sm"
                        tone="muted"
                        className="font-mono"
                      >
                        {JSON.stringify(detail)}
                      </Text>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            )}
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
