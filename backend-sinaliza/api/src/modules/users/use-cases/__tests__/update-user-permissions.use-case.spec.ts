import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { RoleEntity } from '@modules/roles/entities/role.entity';
import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { UserEntity } from '../../entities/user.entity';
import { UsersRepository } from '../../repositories/users.repository';
import { UpdateUserPermissionsUseCase } from '../update-user-permissions.use-case';

describe('UpdateUserPermissionsUseCase', () => {
  const user = { id: 1, uuid: 'user-uuid' } as UserEntity;
  const role = { id: 10, uuid: 'role-uuid', name: 'SECTOR' } as RoleEntity;
  const sector = { id: 20, uuid: 'sector-uuid', name: 'TI' } as SectorEntity;

  let usersRepository: jest.Mocked<UsersRepository>;
  let dataSource: jest.Mocked<DataSource>;
  let roleRepo: { find: jest.Mock };
  let sectorRepo: { find: jest.Mock };
  let userRoleRepo: { delete: jest.Mock; save: jest.Mock; create: jest.Mock };
  let sectorUserRepo: { delete: jest.Mock; save: jest.Mock; create: jest.Mock };
  let useCase: UpdateUserPermissionsUseCase;

  beforeEach(() => {
    usersRepository = { findByUuid: jest.fn() } as unknown as jest.Mocked<UsersRepository>;

    roleRepo = { find: jest.fn().mockResolvedValue([role]) };
    sectorRepo = { find: jest.fn().mockResolvedValue([sector]) };
    userRoleRepo = { delete: jest.fn(), save: jest.fn(), create: jest.fn((v) => v) };
    sectorUserRepo = { delete: jest.fn(), save: jest.fn(), create: jest.fn((v) => v) };

    dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === RoleEntity) return roleRepo;
        if (entity === SectorEntity) return sectorRepo;

        throw new Error('unexpected repository');
      }),
      transaction: jest.fn(async (cb: (manager: unknown) => Promise<void>) =>
        cb({
          getRepository: jest.fn((entity: { name: string }) => {
            if (entity.name === 'UserRoleEntity') return userRoleRepo;

            return sectorUserRepo;
          }),
        }),
      ),
    } as unknown as jest.Mocked<DataSource>;

    useCase = new UpdateUserPermissionsUseCase(usersRepository, dataSource);
  });

  it('throws when the user does not exist', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(
      useCase.execute('missing-uuid', { roles: [], sector_ids: [] }),
    ).rejects.toMatchObject({ i18nKey: 'users.errors.notFound', status: HttpStatus.NOT_FOUND });
  });

  it('throws when a role name does not exist', async () => {
    usersRepository.findByUuid.mockResolvedValue(user);
    roleRepo.find.mockResolvedValue([]);

    await expect(
      useCase.execute(user.uuid, { roles: ['MISSING'], sector_ids: [] }),
    ).rejects.toMatchObject({ i18nKey: 'roles.errors.notFound', status: HttpStatus.NOT_FOUND });
  });

  it('replaces roles and sectors in a single transaction', async () => {
    usersRepository.findByUuid.mockResolvedValue(user);

    const result = await useCase.execute(user.uuid, {
      roles: [role.name],
      sector_ids: [sector.uuid],
    });

    expect(userRoleRepo.delete).toHaveBeenCalledWith({ userId: user.id });
    expect(sectorUserRepo.delete).toHaveBeenCalledWith({ userId: user.id });
    expect(userRoleRepo.save).toHaveBeenCalledWith([{ userId: user.id, roleId: role.id }]);
    expect(sectorUserRepo.save).toHaveBeenCalledWith([{ userId: user.id, sectorId: sector.id }]);
    expect(result).toEqual({ id: user.uuid, roles: [role.name], sector_ids: [sector.uuid] });
  });
});
