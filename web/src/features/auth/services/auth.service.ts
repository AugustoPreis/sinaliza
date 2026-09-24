import { getAuth } from '@core/api/generated/auth/auth';
import type {
  ForgotPasswordDTO,
  LoginDTO,
  LoginResponseDTO,
  MeResponseDTO,
  ResetPasswordDTO,
} from '@core/api/generated/sinalizaAPI.schemas';

const auth = getAuth();

export function login(dto: LoginDTO): Promise<LoginResponseDTO> {
  return auth.authControllerLoginV1(dto);
}

export function logout(): Promise<void> {
  return auth.authControllerLogoutV1();
}

export function getMe(): Promise<MeResponseDTO> {
  return auth.authControllerMeV1();
}

export function forgotPassword(dto: ForgotPasswordDTO): Promise<void> {
  return auth.authControllerForgotPasswordV1(dto);
}

export function resetPassword(dto: ResetPasswordDTO): Promise<void> {
  return auth.authControllerResetPasswordV1(dto);
}

export function refresh(): Promise<LoginResponseDTO> {
  return auth.authControllerRefreshV1();
}
