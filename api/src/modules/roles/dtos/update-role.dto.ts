import { PartialType } from '@nestjs/mapped-types';

import { CreateRoleDTO } from './create-role.dto';

export class UpdateRoleDTO extends PartialType(CreateRoleDTO) {}
