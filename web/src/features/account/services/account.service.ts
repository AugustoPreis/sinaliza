import type { UpdateUserPasswordDTO } from '@core/api/generated/sinalizaAPI.schemas';
import { getUsers } from '@core/api/generated/users/users';

const users = getUsers();

export function updatePassword(dto: UpdateUserPasswordDTO): Promise<void> {
  return users.usersControllerUpdatePasswordV1(dto);
}
