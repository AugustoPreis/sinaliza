import { PartialType } from '@nestjs/mapped-types';

import { CreatePermissionDTO } from './create-permission.dto';

export class UpdatePermissionDTO extends PartialType(CreatePermissionDTO) {}
