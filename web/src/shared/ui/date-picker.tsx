import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@shared/ui/button';
import { Calendar } from '@shared/ui/calendar';
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
  const selectedDate = value ? parseISO(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4" aria-hidden="true" />
          {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
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
