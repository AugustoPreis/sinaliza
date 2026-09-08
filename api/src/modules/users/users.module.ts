import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SharedModule } from '@shared/shared.module';

import { RoleEntity } from '@modules/roles/entities/role.entity';
import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { AdminUsersController } from './controllers/admin-users.controller';
import { UsersController } from './controllers/users.controller';
import { SectorUserEntity } from './entities/sector-user.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { DeleteUserUseCase } from './use-cases/delete-user.use-case';
import { FindUserUseCase } from './use-cases/find-user.use-case';
import { GenerateUsersImportTemplateUseCase } from './use-cases/generate-users-import-template.use-case';
import { ImportUsersUseCase } from './use-cases/import-users.use-case';
import { ListUsersUseCase } from './use-cases/list-users.use-case';
import { RestoreUserAccessUseCase } from './use-cases/restore-user-access.use-case';
import { RevokeUserAccessUseCase } from './use-cases/revoke-user-access.use-case';
import { UpdateUserPasswordUseCase } from './use-cases/update-user-password.use-case';
import { UpdateUserPermissionsUseCase } from './use-cases/update-user-permissions.use-case';
import { UpdateUserUseCase } from './use-cases/update-user.use-case';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([
      UserEntity,
      UserRoleEntity,
      SectorUserEntity,
      RoleEntity,
      SectorEntity,
    ]),
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [
    UsersRepository,
    ListUsersUseCase,
    FindUserUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    UpdateUserPasswordUseCase,
    RevokeUserAccessUseCase,
    RestoreUserAccessUseCase,
    UpdateUserPermissionsUseCase,
    ImportUsersUseCase,
    GenerateUsersImportTemplateUseCase,
  ],
  exports: [UsersRepository],
})
export class UsersModule {}
