import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ForgotPasswordDTO,
  LoginDTO,
  LoginResponseDTO,
  MeResponseDTO,
  ResetPasswordDTO,
} from '@core/api/generated/sinalizaAPI.schemas';
import { useAuthStore } from '@core/auth/auth.store';
import type { ApiError } from '@core/errors/error.types';

import * as authService from '../services/auth.service';

export const authQueryKeys = {
  me: ['auth', 'me'] as const,
};

export function useMeQuery(enabled: boolean): UseQueryResult<MeResponseDTO> {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: authService.getMe,
    enabled,
    retry: false,
  });
}

export function useLoginMutation(): UseMutationResult<LoginResponseDTO, ApiError, LoginDTO> {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(authQueryKeys.me, data.user);
    },
  });
}

export function useLogoutMutation(): UseMutationResult<void, ApiError, void> {
  const clear = useAuthStore((state) => state.clear);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      clear();
      queryClient.clear();
    },
  });
}

export function useForgotPasswordMutation(): UseMutationResult<void, ApiError, ForgotPasswordDTO> {
  return useMutation({ mutationFn: authService.forgotPassword });
}

export function useResetPasswordMutation(): UseMutationResult<void, ApiError, ResetPasswordDTO> {
  return useMutation({ mutationFn: authService.resetPassword });
}
