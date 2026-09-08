import { PartialType, OmitType } from '@nestjs/mapped-types';

import { CreateUserDTO } from './create-user.dto';

export class UpdateUserDTO extends PartialType(OmitType(CreateUserDTO, ['password'] as const)) {}
