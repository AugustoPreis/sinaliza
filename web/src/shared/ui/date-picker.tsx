import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/button';
import { Calendar } from '@shared/ui/calendar';
import { Box, HStack } from '@shared/ui/layout';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';
import { cn } from '@shared/utils/cn';

export interface DatePickerProps {
  id?: string;
  /** ISO date (`yyyy-MM-dd`), matching the native `<input type="date">` format it replaces. */
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Selection-only date field: the trigger is a button, not a text input, so
 * there is no way to type a date — the calendar popover is the only input.
 */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: DatePickerProps): ReactElement {
  const { t } = useTranslation();
  const selectedDate = value ? parseISO(value) : undefined;

  function handleClear(): void {
    onChange(undefined);
  }

  return (
    <Popover>
      <Box className="relative">
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !selectedDate && 'text-muted-foreground',
              selectedDate && 'pr-9',
              className,
            )}
          >
            <HStack gap={2} align="center" className="min-w-0">
              <CalendarIcon className="size-4 shrink-0" aria-hidden="true" />
              <Box className="truncate">
                {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : placeholder}
              </Box>
            </HStack>
          </Button>
        </PopoverTrigger>
        {selectedDate ? (
          // A real sibling button, not a descendant of the trigger: the
          // trigger's own SVG children are `pointer-events-none` (so clicks
          // on the calendar icon fall through to the button), which meant a
          // clear icon nested inside the same trigger never received clicks
          // either — they always fell through to the trigger and reopened it.
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            aria-label={t('actions.clear')}
            className="absolute right-1 top-1/2 size-6 -translate-y-1/2 p-0 opacity-50 hover:opacity-100"
          >
            <X size={14} aria-hidden="true" />
          </Button>
        ) : null}
      </Box>
      <PopoverContent
        className="w-auto min-w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => onChange(date ? format(date, 'yyyy-MM-dd') : undefined)}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
