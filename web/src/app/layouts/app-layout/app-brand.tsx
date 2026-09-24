import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { LogoHorizontal, LogoSymbol } from '@shared/assets/brand/logo';
import { ROUTES } from '@shared/routes';

export interface AppBrandProps {
  collapsed?: boolean;
}

export function AppBrand({ collapsed = false }: AppBrandProps): ReactElement {
  return (
    <Link to={ROUTES.home} className="flex min-w-0 items-center">
      {collapsed ? (
        <LogoSymbol className="size-9 shrink-0" />
      ) : (
        <LogoHorizontal className="h-8 w-auto" />
      )}
    </Link>
  );
}
