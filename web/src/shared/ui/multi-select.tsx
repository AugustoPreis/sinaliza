import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { useState, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@shared/ui/command';
import { Box, HStack } from '@shared/ui/layout';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';
import { cn } from '@shared/utils/cn';

export interface IMultiSelectOption {
  value: string;
  label: ReactNode;
}

export interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: IMultiSelectOption[];
  selectedOptions: IMultiSelectOption[];
  onSearch?: (search: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder: ReactNode;
  searchPlaceholder?: string;
  emptyMessage: ReactNode;
}

export function MultiSelect({
  value,
  onChange,
  options,
  selectedOptions,
  onSearch,
  isLoading = false,
  disabled = false,
  placeholder,
  searchPlaceholder,
  emptyMessage,
}: MultiSelectProps): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  function toggleValue(optionValue: string): void {
    const next = value.includes(optionValue)
      ? value.filter((current) => current !== optionValue)
      : [...value, optionValue];

    onChange(next);
  }

  function removeValue(event: MouseEvent<HTMLDivElement>, optionValue: string): void {
    event.stopPropagation();
    onChange(value.filter((current) => current !== optionValue));
  }

  function handleSearchChange(search: string): void {
    onSearch?.(search);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-auto min-h-9 w-full justify-between gap-2 px-3 py-1.5 font-normal"
        >
          {selectedOptions.length === 0 ? (
            <Box className="text-muted-foreground">{placeholder}</Box>
          ) : (
            <HStack gap={1} wrap className="flex-1">
              {selectedOptions.map((option) => (
                <Box
                  key={option.value}
                  role="button"
                  tabIndex={-1}
                  onClick={(event) => removeValue(event, option.value)}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {option.label}
                  <X size={12} aria-hidden="true" />
                </Box>
              ))}
            </HStack>
          )}
          <ChevronsUpDown size={16} aria-hidden="true" className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {isLoading ? (
              <HStack align="center" justify="center" gap={2} className="py-6 text-sm text-muted-foreground">
                <Loader2 size={16} aria-hidden="true" className="animate-spin" />
                {t('actions.loading')}
              </HStack>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => {
                    const isSelected = value.includes(option.value);

                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => toggleValue(option.value)}
                      >
                        <Check
                          size={16}
                          aria-hidden="true"
                          className={cn(isSelected ? 'opacity-100' : 'opacity-0')}
                        />
                        {option.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
