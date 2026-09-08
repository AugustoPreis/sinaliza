import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiPaginatedResponse, RequirePermission } from '@shared/decorators';
import { ParseUuidPipe } from '@shared/pipes/parse-uuid.pipe';

import { CreateRoleDTO } from '../dtos/create-role.dto';
import { ListRoleDTO } from '../dtos/list-role.dto';
import { RoleResponseDTO } from '../dtos/role-response.dto';
import { UpdateRolePermissionsDTO } from '../dtos/update-role-permissions.dto';
import { UpdateRoleDTO } from '../dtos/update-role.dto';
import { CloneRoleUseCase } from '../use-cases/roles/clone-role.use-case';
import { CreateRoleUseCase } from '../use-cases/roles/create-role.use-case';
import { DeleteRoleUseCase } from '../use-cases/roles/delete-role.use-case';
import { FindRoleUseCase } from '../use-cases/roles/find-role.use-case';
import { ListRolesUseCase } from '../use-cases/roles/list-roles.use-case';
import { UpdateRolePermissionsUseCase } from '../use-cases/roles/update-role-permissions.use-case';
import { UpdateRoleUseCase } from '../use-cases/roles/update-role.use-case';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly findRoleUseCase: FindRoleUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
    private readonly updateRolePermissionsUseCase: UpdateRolePermissionsUseCase,
    private readonly cloneRoleUseCase: CloneRoleUseCase,
  ) {}

  @Get()
  @RequirePermission('roles', 'read')
  @ApiOperation({ summary: 'List roles' })
  @ApiPaginatedResponse(RoleResponseDTO)
  findAll(@Query() query: ListRoleDTO): ReturnType<ListRolesUseCase['execute']> {
    return this.listRolesUseCase.execute(query);
  }

  @Get(':uuid')
  @RequirePermission('roles', 'read')
  @ApiOperation({ summary: 'Get role by UUID' })
  findOne(@Param('uuid', ParseUuidPipe) uuid: string): Promise<RoleResponseDTO> {
    return this.findRoleUseCase.execute(uuid);
  }

  @Post()
  @RequirePermission('roles', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new role' })
  create(@Body() dto: CreateRoleDTO): Promise<RoleResponseDTO> {
    return this.createRoleUseCase.execute(dto);
  }

  @Patch(':uuid')
  @RequirePermission('roles', 'update')
  @ApiOperation({ summary: 'Update role' })
  update(
    @Param('uuid', ParseUuidPipe) uuid: string,
    @Body() dto: UpdateRoleDTO,
  ): Promise<RoleResponseDTO> {
    return this.updateRoleUseCase.execute(uuid, dto);
  }

  @Delete(':uuid')
  @RequirePermission('roles', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role' })
  remove(@Param('uuid', ParseUuidPipe) uuid: string): Promise<void> {
    return this.deleteRoleUseCase.execute(uuid);
  }

  @Put(':uuid/permissions')
  @RequirePermission('roles', 'update')
  @ApiOperation({ summary: 'Replace role permissions' })
  updatePermissions(
    @Param('uuid', ParseUuidPipe) uuid: string,
    @Body() dto: UpdateRolePermissionsDTO,
  ): Promise<RoleResponseDTO> {
    return this.updateRolePermissionsUseCase.execute(uuid, dto);
  }

  @Post(':uuid/clone')
  @RequirePermission('roles', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Clone a role, copying its permissions into a new one' })
  clone(
    @Param('uuid', ParseUuidPipe) uuid: string,
    @Body() dto: CreateRoleDTO,
  ): Promise<RoleResponseDTO> {
    return this.cloneRoleUseCase.execute(uuid, dto);
  }
}
