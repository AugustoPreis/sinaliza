import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SharedModule } from '@shared/shared.module';

import { PermissionsController } from './controllers/permissions.controller';
import { RolesController } from './controllers/roles.controller';
import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';
import { PermissionsRelationResolver } from './relation-resolvers/permissions.relation-resolver';
import { PermissionsRepository } from './repositories/permissions.repository';
import { RolesRepository } from './repositories/roles.repository';
import { CreatePermissionUseCase } from './use-cases/permissions/create-permission.use-case';
import { DeletePermissionUseCase } from './use-cases/permissions/delete-permission.use-case';
import { FindPermissionUseCase } from './use-cases/permissions/find-permission.use-case';
import { ListPermissionsUseCase } from './use-cases/permissions/list-permissions.use-case';
import { UpdatePermissionUseCase } from './use-cases/permissions/update-permission.use-case';
import { CloneRoleUseCase } from './use-cases/roles/clone-role.use-case';
import { CreateRoleUseCase } from './use-cases/roles/create-role.use-case';
import { DeleteRoleUseCase } from './use-cases/roles/delete-role.use-case';
import { FindRoleUseCase } from './use-cases/roles/find-role.use-case';
import { ListRolesUseCase } from './use-cases/roles/list-roles.use-case';
import { UpdateRolePermissionsUseCase } from './use-cases/roles/update-role-permissions.use-case';
import { UpdateRoleUseCase } from './use-cases/roles/update-role.use-case';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([RoleEntity, PermissionEntity])],
  controllers: [RolesController, PermissionsController],
  providers: [
    RolesRepository,
    PermissionsRepository,
    ListRolesUseCase,
    FindRoleUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    UpdateRolePermissionsUseCase,
    CloneRoleUseCase,
    ListPermissionsUseCase,
    FindPermissionUseCase,
    CreatePermissionUseCase,
    UpdatePermissionUseCase,
    DeletePermissionUseCase,
    PermissionsRelationResolver,
  ],
  exports: [RolesRepository, PermissionsRepository],
})
export class RolesModule {}
