import type { ReactElement, ReactNode } from 'react';
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

import { Stack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

import { Label } from './label';

export type FormFieldRenderProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = ControllerRenderProps<TFieldValues, TName> & {
  id: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

export interface FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  render: (field: FormFieldRenderProps<TFieldValues, TName>) => ReactNode;
}

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  control,
  name,
  label,
  render,
}: FormFieldProps<TFieldValues, TName>): ReactElement {
  const errorId = `${name}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Stack gap={2}>
          <Label htmlFor={name}>{label}</Label>
          {render({
            ...field,
            id: name,
            'aria-invalid': fieldState.error ? true : undefined,
            'aria-describedby': fieldState.error ? errorId : undefined,
          })}
          {fieldState.error ? (
            <Text id={errorId} size="sm" tone="destructive">
              {fieldState.error.message}
            </Text>
          ) : null}
        </Stack>
      )}
    />
  );
}
