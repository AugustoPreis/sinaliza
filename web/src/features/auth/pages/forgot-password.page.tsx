import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
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

import { useForgotPasswordMutation } from '../queries/auth.queries';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '../schemas/forgot-password.schema';

export function ForgotPasswordPage(): ReactElement {
  const { t } = useTranslation('auth');
  const forgotPasswordMutation = useForgotPasswordMutation();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  function onSubmit(values: ForgotPasswordFormValues): void {
    forgotPasswordMutation.mutate(values, {
      onSuccess: () => {
        toast.success(t('forgotPassword.success'));
        form.reset();
      },
      onError: (error) => {
        toast.error(mapAxiosErrorToAppError(error).message);
      },
    });
  }

  return (
    <AuthLayout
      title={t('forgotPassword.title')}
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
            name="email"
            label={t('forgotPassword.emailLabel')}
            render={(field) => <Input type="email" {...field} />}
          />

          <Button type="submit" disabled={forgotPasswordMutation.isPending}>
            {t('forgotPassword.submit')}
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  );
}
