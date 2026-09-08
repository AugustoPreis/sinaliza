import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { I18nService } from 'nestjs-i18n';
import { DataSource, EntityManager } from 'typeorm';

import { HashService } from '@shared/services/hash.service';
import { UuidService } from '@shared/services/uuid.service';

import { RoleEntity } from '@modules/roles/entities/role.entity';
import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import {
  USERS_IMPORT_ADMIN_ROLE_VALUE,
  USERS_IMPORT_TEMPLATE_COLUMNS,
} from '../constants/users-import.constants';
import { IImportUsersErrorDetail, ImportUsersResultDTO } from '../dtos/import-users-result.dto';
import { SectorUserEntity } from '../entities/sector-user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { UserEntity } from '../entities/user.entity';
import { EInstitutionalLink } from '../enums/institutional-link.enum';
import { EUserStatus } from '../enums/user-status.enum';

interface IParsedRow {
  row: number;
  name: string;
  email: string;
  institutionalLink: EInstitutionalLink;
  sectorRole: 'ADMIN' | 'SECTOR' | 'REQUESTER';
  sectorName: string | null;
}

// RB-12: the whole file is validated (structure AND row content) before a
// single write happens. Any mismatch — header shape or row data — rejects
// the entire spreadsheet, nothing partial is ever persisted.
@Injectable()
export class ImportUsersUseCase {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly hashService: HashService,
    private readonly uuidService: UuidService,
    private readonly i18n: I18nService,
  ) {}

  async execute(file: Express.Multer.File): Promise<ImportUsersResultDTO> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);

    const worksheet = workbook.worksheets[0];

    const headerErrors = this.validateHeader(worksheet);

    if (headerErrors.length) {
      return {
        success: false,
        error: 'INVALID_TEMPLATE',
        details: headerErrors,
        created: 0,
        updated: 0,
      };
    }

    const { rows, errors } = this.parseRows(worksheet);

    if (errors.length) {
      return { success: false, error: 'INVALID_TEMPLATE', details: errors, created: 0, updated: 0 };
    }

    const sectorErrors = await this.validateSectorNames(rows);

    if (sectorErrors.length) {
      return {
        success: false,
        error: 'INVALID_TEMPLATE',
        details: sectorErrors,
        created: 0,
        updated: 0,
      };
    }

    let created = 0;
    let updated = 0;

    await this.dataSource.transaction(async (manager) => {
      const requesterRole = await this.getRoleByName(manager, 'REQUESTER');
      const sectorRole = await this.getRoleByName(manager, 'SECTOR');
      const adminRole = await this.getRoleByName(manager, USERS_IMPORT_ADMIN_ROLE_VALUE);

      for (const row of rows) {
        const userRepo = manager.getRepository(UserEntity);
        const existing = await userRepo.findOne({ where: { email: row.email } });

        let user: UserEntity;

        if (existing) {
          existing.name = row.name;
          existing.institutionalLink = row.institutionalLink;
          user = await userRepo.save(existing);
          updated += 1;
        } else {
          const passwordHash = await this.hashService.hash(randomUUID());

          user = await userRepo.save(
            userRepo.create({
              uuid: this.uuidService.generate(),
              email: row.email,
              name: row.name,
              institutionalLink: row.institutionalLink,
              institutionalId: null,
              passwordHash,
              status: EUserStatus.ACTIVE,
            }),
          );
          created += 1;
        }

        const role =
          row.sectorRole === 'ADMIN'
            ? adminRole
            : row.sectorRole === 'SECTOR'
              ? sectorRole
              : requesterRole;

        const userRoleRepo = manager.getRepository(UserRoleEntity);
        await userRoleRepo.delete({ userId: user.id });
        if (role) {
          await userRoleRepo.save(userRoleRepo.create({ userId: user.id, roleId: role.id }));
        }

        const sectorUserRepo = manager.getRepository(SectorUserEntity);
        await sectorUserRepo.delete({ userId: user.id });
        if (row.sectorName) {
          const sector = await manager
            .getRepository(SectorEntity)
            .findOne({ where: { name: row.sectorName } });

          if (sector) {
            await sectorUserRepo.save(
              sectorUserRepo.create({ userId: user.id, sectorId: sector.id }),
            );
          }
        }
      }
    });

    return { success: true, created, updated };
  }

  private validateHeader(worksheet: ExcelJS.Worksheet | undefined): IImportUsersErrorDetail[] {
    const errors: IImportUsersErrorDetail[] = [];

    if (!worksheet) {
      return [
        { type: 'MISSING_COLUMN', message: this.i18n.translate('users.errors.importEmptySheet') },
      ];
    }

    const headerRow = worksheet.getRow(1);

    USERS_IMPORT_TEMPLATE_COLUMNS.forEach((expected, index) => {
      const cell = headerRow.getCell(index + 1);
      const received = this.cellToString(cell.value);

      if (!received) {
        errors.push({ type: 'MISSING_COLUMN', expected, column_index: index });
      } else if (received !== expected) {
        errors.push({ type: 'COLUMN_ORDER_MISMATCH', expected, received, column_index: index });
      }
    });

    return errors;
  }

  private parseRows(worksheet: ExcelJS.Worksheet): {
    rows: IParsedRow[];
    errors: IImportUsersErrorDetail[];
  } {
    const rows: IParsedRow[] = [];
    const errors: IImportUsersErrorDetail[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const excelRow = worksheet.getRow(rowNumber);

      if (excelRow.actualCellCount === 0) {
        continue;
      }

      const name = this.cellToString(excelRow.getCell(1).value);
      const email = this.cellToString(excelRow.getCell(2).value).toLowerCase();
      const linkValue = this.cellToString(excelRow.getCell(3).value).toUpperCase();
      const sectorPapel = this.cellToString(excelRow.getCell(4).value);

      if (!name || !email) {
        errors.push({
          type: 'INVALID_ROW',
          row: rowNumber,
          message: this.i18n.translate('users.errors.importRowMissingFields', {
            args: { row: rowNumber },
          }),
        });
        continue;
      }

      if (!Object.values(EInstitutionalLink).includes(linkValue as EInstitutionalLink)) {
        errors.push({
          type: 'INVALID_ROW',
          row: rowNumber,
          message: this.i18n.translate('users.errors.importRowInvalidLink', {
            args: { row: rowNumber, value: linkValue },
          }),
        });
        continue;
      }

      const isAdmin = sectorPapel.toUpperCase() === USERS_IMPORT_ADMIN_ROLE_VALUE;

      rows.push({
        row: rowNumber,
        name,
        email,
        institutionalLink: linkValue as EInstitutionalLink,
        sectorRole: isAdmin ? 'ADMIN' : sectorPapel ? 'SECTOR' : 'REQUESTER',
        sectorName: isAdmin ? null : sectorPapel || null,
      });
    }

    return { rows, errors };
  }

  private async validateSectorNames(rows: IParsedRow[]): Promise<IImportUsersErrorDetail[]> {
    const names = [
      ...new Set(rows.filter((r) => r.sectorRole === 'SECTOR').map((r) => r.sectorName!)),
    ];

    if (!names.length) return [];

    const sectors = await this.dataSource.getRepository(SectorEntity).find();
    const known = new Set(sectors.map((s) => s.name));

    const missing = names.filter((name) => !known.has(name));

    return missing.map((name) => ({
      type: 'INVALID_ROW' as const,
      message: this.i18n.translate('users.errors.importUnknownSector', { args: { name } }),
    }));
  }

  private async getRoleByName(manager: EntityManager, name: string): Promise<RoleEntity | null> {
    return manager.getRepository(RoleEntity).findOne({ where: { name } });
  }

  private cellToString(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object' && 'text' in value)
      return String((value as { text: unknown }).text).trim();

    return '';
  }
}
