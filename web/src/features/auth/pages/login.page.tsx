import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { AuthLayout } from '@app/layouts/auth-layout';

import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { ROUTES } from '@shared/routes';
import { Button } from '@shared/ui/button';
import { FormField } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Stack } from '@shared/ui/layout';

import { useLoginMutation } from '../queries/auth.queries';
import { loginSchema, type LoginFormValues } from '../schemas/login.schema';

export function LoginPage(): ReactElement {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  function onSubmit(values: LoginFormValues): void {
    loginMutation.mutate(values, {
      onSuccess: () => {
        toast.success(t('login.success'));
        void navigate({ to: ROUTES.home });
      },
      onError: (error) => {
        toast.error(mapAxiosErrorToAppError(error).message);
      },
    });
  }

  return (
    <AuthLayout
      title={t('login.title')}
      footer={
        <Link to={ROUTES.forgotPassword} className="text-sm underline">
          {t('login.forgotPasswordLink')}
        </Link>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap={4}>
          <FormField
            control={form.control}
            name="identifier"
            label={t('login.emailLabel')}
            render={(field) => <Input type="text" autoComplete="username" {...field} />}
          />

          <FormField
            control={form.control}
            name="password"
            label={t('login.passwordLabel')}
            render={(field) => <Input type="password" {...field} />}
          />

          <Button type="submit" disabled={loginMutation.isPending}>
            {t('login.submit')}
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  );
}
