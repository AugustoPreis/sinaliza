import { CalendarRange, X } from 'lucide-react';
import {
  useState,
  type ReactElement,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Box, Stack } from '@shared/ui/layout';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';

export interface DateRangePickerProps {
  from?: string;
  to?: string;
  onChange: (range: { from?: string; to?: string }) => void;
  placeholder: ReactNode;
  fromLabel: ReactNode;
  toLabel: ReactNode;
  idPrefix: string;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
}

// Popover-based replacement for two bare `<input type="date">`s side by side
// (no visual affordance, cut-off placeholder). Built on the existing
// `Popover` primitive rather than a new calendar library — the project has
// no date-picker dependency and this only needs two native date inputs.
export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder,
  fromLabel,
  toLabel,
  idPrefix,
}: DateRangePickerProps): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const hasValue = Boolean(from || to);
  const summary = hasValue
    ? [from ? formatDate(from) : '…', to ? formatDate(to) : '…'].join(' – ')
    : undefined;

  function handleClear(event: ReactMouseEvent<SVGSVGElement>): void {
    event.stopPropagation();
    event.preventDefault();
    onChange({ from: undefined, to: undefined });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full min-w-0 justify-between gap-2 px-3 font-normal"
        >
          <Box className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <CalendarRange size={16} aria-hidden="true" className="shrink-0 opacity-50" />
            <Box className="min-w-0 flex-1 truncate">
              {summary ?? <Box className="text-muted-foreground">{placeholder}</Box>}
            </Box>
          </Box>
          {hasValue ? (
            <X
              size={16}
              aria-label={t('actions.clear')}
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="shrink-0 opacity-50 hover:opacity-100"
            />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-4">
        <Stack gap={3} className="min-w-[16rem]">
          <Stack gap={2}>
            <Label htmlFor={`${idPrefix}-from`}>{fromLabel}</Label>
            <Input
              id={`${idPrefix}-from`}
              type="date"
              value={from ?? ''}
              onChange={(event) => onChange({ from: event.target.value || undefined, to })}
            />
          </Stack>
          <Stack gap={2}>
            <Label htmlFor={`${idPrefix}-to`}>{toLabel}</Label>
            <Input
              id={`${idPrefix}-to`}
              type="date"
              value={to ?? ''}
              onChange={(event) => onChange({ from, to: event.target.value || undefined })}
            />
          </Stack>
        </Stack>
      </PopoverContent>
    </Popover>
  );
}
