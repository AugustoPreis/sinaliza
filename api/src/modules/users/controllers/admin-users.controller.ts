import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiPaginatedResponse, RequirePermission } from '@shared/decorators';
import { ParseUuidPipe } from '@shared/pipes/parse-uuid.pipe';

import { ImportUsersResultDTO } from '../dtos/import-users-result.dto';
import { RevokeUserAccessDTO } from '../dtos/revoke-user-access.dto';
import { UpdateUserPermissionsResponseDTO } from '../dtos/update-user-permissions-response.dto';
import { UpdateUserPermissionsDTO } from '../dtos/update-user-permissions.dto';
import { UserAccessResponseDTO } from '../dtos/user-access-response.dto';
import { UserQueryDTO } from '../dtos/user-query.dto';
import { UserResponseDTO } from '../dtos/user-response.dto';
import { GenerateUsersImportTemplateUseCase } from '../use-cases/generate-users-import-template.use-case';
import { ImportUsersUseCase } from '../use-cases/import-users.use-case';
import { ListUsersUseCase } from '../use-cases/list-users.use-case';
import { RestoreUserAccessUseCase } from '../use-cases/restore-user-access.use-case';
import { RevokeUserAccessUseCase } from '../use-cases/revoke-user-access.use-case';
import { UpdateUserPermissionsUseCase } from '../use-cases/update-user-permissions.use-case';

// Separate from `UsersController`: these routes are all administration-only
// (Tela C.3/C.4) and live under `admin/users/...` per
// `endpoints-sinaliza.md` §13/§14, instead of overloading the base
// `/users` resource with admin-specific actions.
@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller({ path: 'admin/users', version: '1' })
export class AdminUsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly generateUsersImportTemplateUseCase: GenerateUsersImportTemplateUseCase,
    private readonly importUsersUseCase: ImportUsersUseCase,
    private readonly updateUserPermissionsUseCase: UpdateUserPermissionsUseCase,
    private readonly revokeUserAccessUseCase: RevokeUserAccessUseCase,
    private readonly restoreUserAccessUseCase: RestoreUserAccessUseCase,
  ) {}

  @Get()
  @RequirePermission('users', 'read')
  @ApiOperation({ summary: 'List imported users (Tela C.4)' })
  @ApiPaginatedResponse(UserResponseDTO)
  findAll(@Query() query: UserQueryDTO): ReturnType<ListUsersUseCase['execute']> {
    return this.listUsersUseCase.execute(query);
  }

  @Get('import-template')
  @RequirePermission('users', 'import')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="modelo_usuarios_sinaliza.xlsx"')
  @ApiOperation({ summary: 'Download the official bulk-import spreadsheet template' })
  async downloadImportTemplate(): Promise<StreamableFile> {
    const buffer = await this.generateUsersImportTemplateUseCase.execute();

    return new StreamableFile(buffer);
  }

  @Post('import')
  @RequirePermission('users', 'import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: 'Validate and bulk-import users from a spreadsheet (RB-12: atomic)' })
  importUsers(@UploadedFile() file: Express.Multer.File): Promise<ImportUsersResultDTO> {
    return this.importUsersUseCase.execute(file);
  }

  @Patch(':uuid/permissions')
  @RequirePermission('users', 'manage-permissions')
  @ApiOperation({ summary: 'Replace a user roles and sector assignments (Tela C.4)' })
  updatePermissions(
    @Param('uuid', ParseUuidPipe) uuid: string,
    @Body() dto: UpdateUserPermissionsDTO,
  ): Promise<UpdateUserPermissionsResponseDTO> {
    return this.updateUserPermissionsUseCase.execute(uuid, dto);
  }

  @Post(':uuid/revoke')
  @RequirePermission('users', 'revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a user access without deleting it (RB-13)' })
  revoke(
    @Param('uuid', ParseUuidPipe) uuid: string,
    @Body() dto: RevokeUserAccessDTO,
  ): Promise<UserAccessResponseDTO> {
    return this.revokeUserAccessUseCase.execute(uuid, dto);
  }

  @Post(':uuid/restore')
  @RequirePermission('users', 'revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a previously revoked user access' })
  restore(@Param('uuid', ParseUuidPipe) uuid: string): Promise<UserAccessResponseDTO> {
    return this.restoreUserAccessUseCase.execute(uuid);
  }
}
