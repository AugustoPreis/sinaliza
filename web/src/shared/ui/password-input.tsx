import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentPropsWithoutRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Box } from '@shared/ui/layout';
import { cn } from '@shared/utils/cn';

export type PasswordInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'>;

export function PasswordInput({ className, ...props }: PasswordInputProps): ReactElement {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <Box className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-9', className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 size-9"
        aria-label={visible ? t('actions.hidePassword') : t('actions.showPassword')}
        onClick={() => setVisible((previous) => !previous)}
      >
        {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </Button>
    </Box>
  );
}
