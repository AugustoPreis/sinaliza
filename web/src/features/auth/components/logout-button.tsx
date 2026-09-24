import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/button';

import { useLogout } from '../hooks/use-logout.hook';

export function LogoutButton(): ReactElement {
  const { t } = useTranslation('auth');
  const { logout, isPending } = useLogout();

  return (
    <Button type="button" variant="outline" onClick={logout} disabled={isPending}>
      {t('logout')}
    </Button>
  );
}
