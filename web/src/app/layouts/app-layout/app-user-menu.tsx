import { Link } from '@tanstack/react-router';
import { LogOut, Moon, Settings2, Sun, User } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useThemeMode } from '@app/providers/theme';

import { useAuthStore } from '@core/auth/auth.store';
import { ROUTES } from '@shared/routes';
import { Avatar, AvatarFallback } from '@shared/ui/avatar';
import { Button } from '@shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { Grid, Stack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';
import { getInitials } from '@shared/utils/get-initials';

import { useLogout } from '@features/auth';

export function AppUserMenu(): ReactElement | null {
  const { t } = useTranslation('auth');
  const user = useAuthStore((state) => state.user);
  const { logout, isPending } = useLogout();
  const { resolvedMode, setMode } = useThemeMode();
  const isDark = resolvedMode === 'dark';

  function toggleThemeMode(e: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
    e.preventDefault();

    setMode(isDark ? 'light' : 'dark');
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t('userMenu.trigger', { ns: 'common' })}
        >
          <Avatar>
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <Stack gap={0}>
            <Text size="sm" weight="medium">
              {user.name}
            </Text>
            <Text size="sm" tone="muted">
              {user.email}
            </Text>
          </Stack>
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to={ROUTES.account}>
            <User size={16} aria-hidden="true" />
            {t('userMenu.myProfile', { ns: 'common' })}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={ROUTES.preferences}>
            <Settings2 size={16} aria-hidden="true" />
            {t('userMenu.preferences', { ns: 'common' })}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild onClick={toggleThemeMode}>
          <Grid>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? t('common:theme.switchToLightMode') : t('common:theme.switchToDarkMode')}
          </Grid>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={logout}
          disabled={isPending}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut size={16} aria-hidden="true" />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
