import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useState, type ReactElement, type ReactNode } from 'react';
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

export interface IApiSelectOption {
  value: string;
  label: ReactNode;
}

export interface ApiSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  options: IApiSelectOption[];
  selectedOption?: IApiSelectOption;
  onSearch?: (search: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder: ReactNode;
  searchPlaceholder?: string;
  emptyMessage: ReactNode;
}

export function ApiSelect({
  value,
  onChange,
  options,
  selectedOption,
  onSearch,
  isLoading = false,
  disabled = false,
  placeholder,
  searchPlaceholder,
  emptyMessage,
}: ApiSelectProps): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  function handleSelect(optionValue: string): void {
    onChange(optionValue === value ? undefined : optionValue);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-9 w-full justify-between gap-2 px-3 font-normal"
        >
          <Box className="min-w-0 flex-1 truncate text-left">
            {selectedOption ? selectedOption.label : <Box className="text-muted-foreground">{placeholder}</Box>}
          </Box>
          <ChevronsUpDown size={16} aria-hidden="true" className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} onValueChange={onSearch} />
          <CommandList>
            {isLoading ? (
              <HStack
                align="center"
                justify="center"
                gap={2}
                className="py-6 text-sm text-muted-foreground"
              >
                <Loader2 size={16} aria-hidden="true" className="animate-spin" />
                {t('actions.loading')}
              </HStack>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => {
                    const isSelected = value === option.value;

                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => handleSelect(option.value)}
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
