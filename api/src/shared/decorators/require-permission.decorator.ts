import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export interface IRequiredPermission {
  resource: string;
  action: string;
}

export const RequirePermission = (resource: string, action: string): CustomDecorator =>
  SetMetadata(PERMISSION_KEY, { resource, action });
