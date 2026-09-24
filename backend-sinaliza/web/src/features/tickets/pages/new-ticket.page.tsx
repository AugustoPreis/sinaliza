import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { getClassification } from '@core/api/generated/classification/classification';
import type { ClassificationResponseDTO } from '@core/api/generated/sinalizaAPI.schemas';
import { getTickets } from '@core/api/generated/tickets/tickets';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { Container, Stack } from '@shared/ui/layout';
import { Textarea } from '@shared/ui/textarea';
import { Heading, Text } from '@shared/ui/typography';

import { fetchLocations } from '../services/locations.service';
import { fetchSectors } from '../services/sectors.service';

export function NewTicketPage(): ReactElement {
  const { t } = useTranslation('tickets');
  const [description, setDescription] = useState('');
  const [suggestion, setSuggestion] = useState<ClassificationResponseDTO>();
  const [confirmed, setConfirmed] = useState('');
  const [building, setBuilding] = useState('');
  const [environment, setEnvironment] = useState('');
  const sectors = useQuery({ queryKey: ['sectors'], queryFn: fetchSectors });
  const locations = useQuery({ queryKey: ['locations'], queryFn: () => fetchLocations() });
  const preview = useMutation({
    mutationFn: () =>
      getClassification().classificationControllerPreviewV1({ description: description.trim() }),
    onSuccess: (result) => {
      setSuggestion(result);
      setConfirmed(result.automatic_sector.id);
    },
  });
  const create = useMutation({
    mutationFn: () => {
      if (!suggestion || !confirmed || !building || !environment)
        throw new Error(t('new.incomplete'));
      return getTickets().ticketsControllerCreateV1({
        description: description.trim(),
        location: JSON.stringify({ building_id: building, environment_id: environment }),
        automatic_sector_id: suggestion.automatic_sector.id,
        confirmed_sector_id: confirmed,
      });
    },
  });
  const busy = preview.isPending || create.isPending;
  const environments =
    locations.data?.buildings.find((item) => item.id === building)?.environments ?? [];
  const selectClass = 'h-10 w-full rounded-md border bg-background px-3 text-sm';

  if (create.data)
    return (
      <Container>
        <Stack gap={4}>
          <Heading level={1}>{t('new.success')}</Heading>
          <Text role="status">{t('new.protocol', { protocol: create.data.protocol })}</Text>
          <Text>{t('new.suggestion', { sector: create.data.automatic_sector.name })}</Text>
          <Text>{t('new.destination', { sector: create.data.current_sector.name })}</Text>
          <Button
            onClick={() => {
              create.reset();
              preview.reset();
              setDescription('');
              setSuggestion(undefined);
              setConfirmed('');
            }}
          >
            {t('new.again')}
          </Button>
        </Stack>
      </Container>
    );

  return (
    <Container>
      <Stack gap={4}>
        <Heading level={1}>{t('new.title')}</Heading>
        <Text>{t('new.help')}</Text>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <Stack gap={4}>
            <Label htmlFor="description">{t('new.description')}</Label>
            <Textarea
              id="description"
              required
              maxLength={2000}
              value={description}
              disabled={busy}
              onChange={(event) => {
                setDescription(event.target.value);
                setSuggestion(undefined);
                setConfirmed('');
                preview.reset();
                create.reset();
              }}
            />
            <Button
              type="button"
              disabled={busy || !description.trim()}
              onClick={() => {
                setSuggestion(undefined);
                setConfirmed('');
                preview.mutate();
              }}
            >
              {t(preview.isPending ? 'new.classifying' : 'new.classify')}
            </Button>
            {preview.isError && <Text role="alert">{t('new.classificationError')}</Text>}
            {suggestion && (
              <Text role="status">
                {t('new.suggestion', { sector: suggestion.automatic_sector.name })}
              </Text>
            )}
            {(sectors.isError || locations.isError) && (
              <Text role="alert">{t('new.optionsError')}</Text>
            )}
            <Label htmlFor="confirmed-sector">{t('new.confirmed')}</Label>
            <select
              id="confirmed-sector"
              className={selectClass}
              required
              value={confirmed}
              disabled={busy || !suggestion}
              onChange={(event) => setConfirmed(event.target.value)}
            >
              <option value="">{t('new.choose')}</option>
              {sectors.data?.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Label htmlFor="building">{t('new.building')}</Label>
            <select
              id="building"
              className={selectClass}
              required
              value={building}
              disabled={busy}
              onChange={(event) => {
                setBuilding(event.target.value);
                setEnvironment('');
              }}
            >
              <option value="">{t('new.choose')}</option>
              {locations.data?.buildings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Label htmlFor="environment">{t('new.environment')}</Label>
            <select
              id="environment"
              className={selectClass}
              required
              value={environment}
              disabled={busy || !building}
              onChange={(event) => setEnvironment(event.target.value)}
            >
              <option value="">{t('new.choose')}</option>
              {environments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {create.isError && <Text role="alert">{t('new.createError')}</Text>}
            <Button
              type="submit"
              disabled={busy || !suggestion || !confirmed || !building || !environment}
            >
              {t(create.isPending ? 'new.sending' : 'new.submit')}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
