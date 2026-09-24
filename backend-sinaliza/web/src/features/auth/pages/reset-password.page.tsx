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

import { useResetPasswordMutation } from '../queries/auth.queries';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '../schemas/reset-password.schema';

export interface ResetPasswordPageProps {
  token: string;
}

export function ResetPasswordPage({ token }: ResetPasswordPageProps): ReactElement {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const resetPasswordMutation = useResetPasswordMutation();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  function onSubmit(values: ResetPasswordFormValues): void {
    resetPasswordMutation.mutate(
      {
        ...values,
        token,
      },
      {
        onSuccess: () => {
          toast.success(t('resetPassword.success'));
          void navigate({ to: ROUTES.login });
        },
        onError: (error) => {
          toast.error(mapAxiosErrorToAppError(error).message);
        },
      },
    );
  }

  return (
    <AuthLayout
      title={t('resetPassword.title')}
      footer={
        <Link to={ROUTES.login} className="text-sm underline">
          {t('forgotPassword.backToLoginLink')}
        </Link>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap={4}>
          <FormField
            control={form.control}
            name="newPassword"
            label={t('resetPassword.newPasswordLabel')}
            render={(field) => <Input type="password" {...field} />}
          />

          <FormField
            control={form.control}
            name="confirmNewPassword"
            label={t('resetPassword.confirmNewPasswordLabel')}
            render={(field) => <Input type="password" {...field} />}
          />

          <Button type="submit" disabled={resetPasswordMutation.isPending}>
            {t('resetPassword.submit')}
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  );
}
