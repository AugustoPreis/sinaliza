import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skipCsrf';

export const SkipCsrf = (): CustomDecorator => SetMetadata(SKIP_CSRF_KEY, true);
