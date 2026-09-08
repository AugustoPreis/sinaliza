import { Body, Controller, Delete, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@shared/decorators';

import { RegisterDeviceTokenDTO } from '../dtos/register-device-token.dto';
import { RemoveDeviceTokenDTO } from '../dtos/remove-device-token.dto';
import { RegisterDeviceTokenUseCase } from '../use-cases/register-device-token.use-case';
import { RemoveDeviceTokenUseCase } from '../use-cases/remove-device-token.use-case';

// Self-service, no `@RequirePermission`: any authenticated user manages
// their own device tokens.
@ApiTags('Devices')
@ApiBearerAuth()
@Controller({ path: 'devices', version: '1' })
export class DevicesController {
  constructor(
    private readonly registerDeviceTokenUseCase: RegisterDeviceTokenUseCase,
    private readonly removeDeviceTokenUseCase: RemoveDeviceTokenUseCase,
  ) {}

  @Post('push-token')
  @ApiOperation({ summary: 'Register a push token for the authenticated device' })
  register(
    @CurrentUser('uuid') currentUserUuid: string,
    @Body() dto: RegisterDeviceTokenDTO,
  ): Promise<{ success: true }> {
    return this.registerDeviceTokenUseCase.execute(currentUserUuid, dto);
  }

  @Delete('push-token')
  @ApiOperation({ summary: 'Remove a push token, e.g. on logout' })
  remove(
    @CurrentUser('uuid') currentUserUuid: string,
    @Body() dto: RemoveDeviceTokenDTO,
  ): Promise<{ success: true }> {
    return this.removeDeviceTokenUseCase.execute(currentUserUuid, dto);
  }
}
