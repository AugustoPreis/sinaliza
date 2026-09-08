import { X } from 'lucide-react';
import { useState, type KeyboardEvent, type ReactElement } from 'react';

import { Input } from '@shared/ui/input';
import { Box, HStack } from '@shared/ui/layout';

export interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Simple tags input for the sector "categories" field: type a value and
// press Enter or "," to add it as a tag; click the X to remove one.
export function TagInput({ value, onChange, placeholder, disabled }: TagInputProps): ReactElement {
  const [draft, setDraft] = useState('');

  function addTag(rawTag: string): void {
    const tag = rawTag.trim();

    if (tag.length === 0 || value.includes(tag)) {
      return;
    }

    onChange([...value, tag]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(draft);
      setDraft('');

      return;
    }

    if (event.key === 'Backspace' && draft.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handleBlur(): void {
    if (draft.trim().length > 0) {
      addTag(draft);
      setDraft('');
    }
  }

  function removeTag(tag: string): void {
    onChange(value.filter((current) => current !== tag));
  }

  return (
    <Box className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring">
      {value.map((tag) => (
        <HStack
          key={tag}
          align="center"
          gap={1}
          className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            disabled={disabled}
            aria-label={tag}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </HStack>
      ))}
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : undefined}
        disabled={disabled}
        className="h-6 flex-1 border-none p-0 shadow-none focus-visible:ring-0"
      />
    </Box>
  );
}
