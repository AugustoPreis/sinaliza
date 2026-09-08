import type { ComponentPropsWithoutRef, ReactElement } from 'react';

export type BoxElement =
  'div' | 'main' | 'section' | 'header' | 'footer' | 'nav' | 'article' | 'aside';

export interface BoxProps extends ComponentPropsWithoutRef<'div'> {
  as?: BoxElement;
}

export function Box({ as: Tag = 'div', ...props }: BoxProps): ReactElement {
  return <Tag {...props} />;
}
