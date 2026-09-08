import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { I18nLang } from 'nestjs-i18n';

import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { Public } from '@shared/decorators/public.decorator';
import { SkipCsrf } from '@shared/decorators/skip-csrf.decorator';
import { UuidService } from '@shared/services/uuid.service';

import { ForgotPasswordDTO } from '../dtos/forgot-password.dto';
import { LoginResponseDTO } from '../dtos/login-response.dto';
import { LoginDTO } from '../dtos/login.dto';
import { MeResponseDTO } from '../dtos/me-response.dto';
import { ResetPasswordDTO } from '../dtos/reset-password.dto';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { IAuthUser } from '../interfaces/auth-user.interface';
import { IJwtPayload } from '../interfaces/jwt-payload.interface';
import { ForgotPasswordUseCase } from '../use-cases/forgot-password.use-case';
import { GetMeUseCase } from '../use-cases/get-me.use-case';
import { LoginUseCase } from '../use-cases/login.use-case';
import { LogoutUseCase } from '../use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case';
import { ResetPasswordUseCase } from '../use-cases/reset-password.use-case';
import { REFRESH_TOKEN_COOKIE, clearAuthCookies, setAuthCookies } from '../utils/auth-cookies.util';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly config: ConfigService,
    private readonly uuidService: UuidService,
  ) {}

  @Post('login')
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ type: LoginResponseDTO })
  async login(
    @Body() _dto: LoginDTO,
    @CurrentUser() user: IAuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDTO> {
    const result = await this.loginUseCase.execute(user);

    setAuthCookies(res, this.config, result, this.uuidService.generate('v4'));

    return { user: result.user };
  }

  @Post('refresh')
  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using the refresh_token cookie' })
  @ApiOkResponse({ type: LoginResponseDTO })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDTO> {
    const result = await this.refreshTokenUseCase.execute(req.cookies[REFRESH_TOKEN_COOKIE]);

    setAuthCookies(res, this.config, result, this.uuidService.generate('v4'));

    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the refresh token and clear session cookies' })
  async logout(
    @CurrentUser() user: IJwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.logoutUseCase.execute(user.sub);

    clearAuthCookies(res, this.config);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  me(@CurrentUser() user: IJwtPayload): Promise<MeResponseDTO> {
    return this.getMeUseCase.execute(user.sub);
  }

  @Post('forgot-password')
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request a password reset e-mail' })
  forgotPassword(@Body() dto: ForgotPasswordDTO, @I18nLang() locale: string): Promise<void> {
    return this.forgotPasswordUseCase.execute(dto.email, locale);
  }

  @Post('reset-password')
  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password using the token received by e-mail' })
  resetPassword(@Body() dto: ResetPasswordDTO): Promise<void> {
    return this.resetPasswordUseCase.execute(dto);
  }
}
