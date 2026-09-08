import * as ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';

import { HashService } from '@shared/services/hash.service';
import { UuidService } from '@shared/services/uuid.service';

import { RoleEntity } from '@modules/roles/entities/role.entity';
import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { USERS_IMPORT_TEMPLATE_COLUMNS } from '../../constants/users-import.constants';
import { SectorUserEntity } from '../../entities/sector-user.entity';
import { UserRoleEntity } from '../../entities/user-role.entity';
import { UserEntity } from '../../entities/user.entity';
import { ImportUsersUseCase } from '../import-users.use-case';

async function buildWorkbookBuffer(
  headers: string[],
  rows: (string | number)[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('usuarios');

  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(row));

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function asMulterFile(buffer: Buffer): Express.Multer.File {
  return { buffer } as Express.Multer.File;
}

describe('ImportUsersUseCase', () => {
  const requesterRole = { id: 1, name: 'REQUESTER' } as RoleEntity;
  const sectorRole = { id: 2, name: 'SECTOR' } as RoleEntity;
  const adminRole = { id: 3, name: 'ADMIN' } as RoleEntity;
  const sector = { id: 5, uuid: 'sector-uuid', name: 'TI' } as SectorEntity;

  let hashService: jest.Mocked<HashService>;
  let uuidService: jest.Mocked<UuidService>;
  let dataSource: jest.Mocked<DataSource>;
  let userRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let userRoleRepo: { delete: jest.Mock; save: jest.Mock; create: jest.Mock };
  let sectorUserRepo: { delete: jest.Mock; save: jest.Mock; create: jest.Mock };
  let roleRepo: { findOne: jest.Mock; find: jest.Mock };
  let sectorRepo: { findOne: jest.Mock; find: jest.Mock };
  let useCase: ImportUsersUseCase;

  beforeEach(() => {
    hashService = { hash: jest.fn().mockResolvedValue('hashed') } as unknown as jest.Mocked<HashService>;
    uuidService = { generate: jest.fn().mockReturnValue('new-uuid') };

    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((u) => ({ id: 100, ...u })),
      create: jest.fn((v) => v),
    };
    userRoleRepo = { delete: jest.fn(), save: jest.fn(), create: jest.fn((v) => v) };
    sectorUserRepo = { delete: jest.fn(), save: jest.fn(), create: jest.fn((v) => v) };
    roleRepo = {
      findOne: jest.fn(({ where: { name } }: { where: { name: string } }) => {
        if (name === 'REQUESTER') return Promise.resolve(requesterRole);
        if (name === 'SECTOR') return Promise.resolve(sectorRole);
        if (name === 'ADMIN') return Promise.resolve(adminRole);

        return Promise.resolve(null);
      }),
      find: jest.fn(),
    };
    sectorRepo = {
      findOne: jest.fn().mockResolvedValue(sector),
      find: jest.fn().mockResolvedValue([sector]),
    };

    const managerRepos = new Map<unknown, unknown>([
      [UserEntity, userRepo],
      [UserRoleEntity, userRoleRepo],
      [SectorUserEntity, sectorUserRepo],
      [RoleEntity, roleRepo],
      [SectorEntity, sectorRepo],
    ]);

    dataSource = {
      getRepository: jest.fn((entity: unknown) => managerRepos.get(entity)),
      transaction: jest.fn(async (cb: (manager: unknown) => Promise<void>) =>
        cb({ getRepository: jest.fn((entity: unknown) => managerRepos.get(entity)) }),
      ),
    } as unknown as jest.Mocked<DataSource>;

    useCase = new ImportUsersUseCase(dataSource, hashService, uuidService);
  });

  it('rejects the whole file when the header is missing a column', async () => {
    const buffer = await buildWorkbookBuffer(
      ['nome', 'email_institucional', 'vinculo'],
      [['Maria Silva', 'maria@x.edu', 'ALUNO']],
    );

    const result = await useCase.execute(asMulterFile(buffer));

    expect(result.success).toBe(false);
    expect(result.error).toBe('INVALID_TEMPLATE');
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('rejects the whole file when a column is out of order', async () => {
    const buffer = await buildWorkbookBuffer(
      ['email_institucional', 'nome', 'vinculo', 'setor_papel'],
      [['maria@x.edu', 'Maria Silva', 'ALUNO', '']],
    );

    const result = await useCase.execute(asMulterFile(buffer));

    expect(result.success).toBe(false);
    expect(result.details?.[0]).toMatchObject({ type: 'COLUMN_ORDER_MISMATCH' });
  });

  it('rejects the whole file when a row has an invalid vinculo', async () => {
    const buffer = await buildWorkbookBuffer(
      [...USERS_IMPORT_TEMPLATE_COLUMNS],
      [['Maria Silva', 'maria@x.edu', 'ESTRANGEIRO', '']],
    );

    const result = await useCase.execute(asMulterFile(buffer));

    expect(result.success).toBe(false);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('creates new users with REQUESTER role when setor_papel is blank', async () => {
    const buffer = await buildWorkbookBuffer(
      [...USERS_IMPORT_TEMPLATE_COLUMNS],
      [['Maria Silva', 'maria@x.edu', 'ALUNO', '']],
    );

    const result = await useCase.execute(asMulterFile(buffer));

    expect(result).toEqual({ success: true, created: 1, updated: 0 });
    expect(userRoleRepo.save).toHaveBeenCalledWith({ userId: 100, roleId: requesterRole.id });
  });

  it('assigns SECTOR role and links the sector when setor_papel matches an existing sector', async () => {
    const buffer = await buildWorkbookBuffer(
      [...USERS_IMPORT_TEMPLATE_COLUMNS],
      [['Joao Souza', 'joao@x.edu', 'SERVIDOR', 'TI']],
    );

    const result = await useCase.execute(asMulterFile(buffer));

    expect(result).toEqual({ success: true, created: 1, updated: 0 });
    expect(userRoleRepo.save).toHaveBeenCalledWith({ userId: 100, roleId: sectorRole.id });
    expect(sectorUserRepo.save).toHaveBeenCalledWith({ userId: 100, sectorId: sector.id });
  });

  it('updates an existing user (matched by e-mail) instead of creating a new one', async () => {
    userRepo.findOne.mockResolvedValue({ id: 7, email: 'maria@x.edu' });

    const buffer = await buildWorkbookBuffer(
      [...USERS_IMPORT_TEMPLATE_COLUMNS],
      [['Maria Silva', 'maria@x.edu', 'ALUNO', '']],
    );

    const result = await useCase.execute(asMulterFile(buffer));

    expect(result).toEqual({ success: true, created: 0, updated: 1 });
  });

  it('rejects the whole file when setor_papel references an unknown sector', async () => {
    sectorRepo.find.mockResolvedValue([]);

    const buffer = await buildWorkbookBuffer(
      [...USERS_IMPORT_TEMPLATE_COLUMNS],
      [['Joao Souza', 'joao@x.edu', 'SERVIDOR', 'Setor Inexistente']],
    );

    const result = await useCase.execute(asMulterFile(buffer));

    expect(result.success).toBe(false);
    expect(userRepo.save).not.toHaveBeenCalled();
  });
});
