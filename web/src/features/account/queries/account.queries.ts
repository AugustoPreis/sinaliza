import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import type { UpdateUserPasswordDTO } from '@core/api/generated/sinalizaAPI.schemas';
import type { ApiError } from '@core/errors/error.types';

import * as accountService from '../services/account.service';

export function useUpdatePasswordMutation(): UseMutationResult<
  void,
  ApiError,
  UpdateUserPasswordDTO
> {
  return useMutation({ mutationFn: accountService.updatePassword });
}
