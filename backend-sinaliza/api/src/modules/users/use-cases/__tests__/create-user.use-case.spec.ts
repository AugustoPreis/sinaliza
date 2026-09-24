import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { HashService } from '@shared/services/hash.service';
import { UuidService } from '@shared/services/uuid.service';

import { RoleEntity } from '@modules/roles/entities/role.entity';

import { createMockRepository } from '../../../../../test/support/mock-repository';
import { CreateUserDTO } from '../../dtos/create-user.dto';
import { UserEntity } from '../../entities/user.entity';
import { EUserStatus } from '../../enums/user-status.enum';
import { UsersRepository } from '../../repositories/users.repository';
import { CreateUserUseCase } from '../create-user.use-case';

describe('CreateUserUseCase', () => {
  const usersRepository = mockDeep<UsersRepository>();
  const hashService = mockDeep<HashService>();
  const uuidService = mockDeep<UuidService>();
  const roleRepo = createMockRepository<RoleEntity>();

  const useCase = new CreateUserUseCase(usersRepository, hashService, uuidService, roleRepo);

  const baseDto: CreateUserDTO = {
    email: 'New.User@example.com',
    name: 'New User',
    password: 'S3cret!!!',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usersRepository.findByEmail.mockResolvedValue(null);
    uuidService.generate.mockReturnValue('generated-uuid');
    hashService.hash.mockResolvedValue('hashed-password');
  });

  it('throws when the email is already taken, case-insensitively', async () => {
    usersRepository.findByEmail.mockResolvedValue({ id: 1 } as UserEntity);

    await expect(useCase.execute(baseDto)).rejects.toMatchObject({
      i18nKey: 'users.errors.emailTaken',
      status: HttpStatus.CONFLICT,
    });
    expect(usersRepository.findByEmail).toHaveBeenCalledWith('new.user@example.com');
  });

  it('throws when a role uuid does not exist', async () => {
    roleRepo.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute({ ...baseDto, roleUuids: ['missing-role'] }),
    ).rejects.toMatchObject({
      i18nKey: 'roles.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('creates the user without touching roles when none are provided', async () => {
    const created = { id: 1, uuid: 'generated-uuid', email: 'new.user@example.com' } as UserEntity;

    usersRepository.create.mockResolvedValue(created);

    const result = await useCase.execute(baseDto);

    expect(usersRepository.create).toHaveBeenCalledWith({
      uuid: 'generated-uuid',
      email: 'new.user@example.com',
      name: baseDto.name,
      institutionalId: null,
      institutionalLink: null,
      passwordHash: 'hashed-password',
      status: EUserStatus.ACTIVE,
    });
    expect(usersRepository.setRoles).not.toHaveBeenCalled();
    expect(usersRepository.findByUuid).not.toHaveBeenCalled();
    expect(result.uuid).toBe(created.uuid);
  });

  it('resolves and assigns roles when role uuids are provided', async () => {
    const role = { id: 5, uuid: 'role-uuid' } as RoleEntity;
    const created = { id: 1, uuid: 'generated-uuid' } as UserEntity;
    const withRoles = { ...created, userRoles: [] } as unknown as UserEntity;

    roleRepo.findOne.mockResolvedValue(role);
    usersRepository.create.mockResolvedValue(created);
    usersRepository.findByUuid.mockResolvedValue(withRoles);

    const result = await useCase.execute({ ...baseDto, roleUuids: [role.uuid] });

    expect(usersRepository.setRoles).toHaveBeenCalledWith(created.id, [role.id]);
    expect(usersRepository.findByUuid).toHaveBeenCalledWith(created.uuid);
    expect(result.uuid).toBe(withRoles.uuid);
  });
});
