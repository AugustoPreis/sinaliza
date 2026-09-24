import { Upload } from 'lucide-react';
import {
  useId,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';

import { Button } from '@shared/ui/button';
import { HStack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

export interface FileInputProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'className'
> {
  buttonLabel: ReactNode;
  noFileLabel: ReactNode;
}

// Styled replacement for the raw `<input type="file">`, which renders as
// "Choose File / No file chosen" with no way to match the rest of the
// design system. The native input itself stays in the DOM (visually
// hidden) so keyboard/file-picker behavior is untouched - only its default
// chrome is swapped for a Button + filename text.
export function FileInput({
  buttonLabel,
  noFileLabel,
  onChange,
  ...props
}: FileInputProps): ReactElement {
  const inputId = useId();
  const [fileName, setFileName] = useState<string | undefined>(undefined);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    setFileName(event.target.files?.[0]?.name);
    onChange?.(event);
  }

  return (
    <HStack gap={3} align="center">
      <Button type="button" variant="outline" asChild className="w-fit cursor-pointer">
        <label htmlFor={inputId}>
          <Upload size={16} aria-hidden="true" />
          {buttonLabel}
        </label>
      </Button>
      <Text size="sm" tone="muted">
        {fileName ?? noFileLabel}
      </Text>
      <input id={inputId} type="file" className="sr-only" onChange={handleChange} {...props} />
    </HStack>
  );
}
