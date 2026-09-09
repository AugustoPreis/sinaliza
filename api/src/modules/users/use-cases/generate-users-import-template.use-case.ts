import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import {
  USERS_IMPORT_ADMIN_ROLE_VALUE,
  USERS_IMPORT_SHEET_NAME,
  USERS_IMPORT_TEMPLATE_COLUMNS,
} from '../constants/users-import.constants';

const SECTOR_LIST_SHEET_NAME = 'listas_setor_papel';
const INSTRUCTIONS_SHEET_NAME = 'Instruções';
const MAX_VALIDATED_ROW = 1000;

@Injectable()
export class GenerateUsersImportTemplateUseCase {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(): Promise<Buffer> {
    const sectors = await this.dataSource.getRepository(SectorEntity).find();
    const sectorNames = sectors.map((sector) => sector.name);
    const allowedValues = [USERS_IMPORT_ADMIN_ROLE_VALUE, ...sectorNames];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(USERS_IMPORT_SHEET_NAME);

    worksheet.columns = USERS_IMPORT_TEMPLATE_COLUMNS.map((header) => ({
      header,
      key: header,
      width: 28,
    }));

    worksheet.addRow({
      nome: 'Maria Silva',
      email_institucional: 'maria.silva@instituicao.edu.br',
      vinculo: 'ALUNO',
      setor_papel: '',
    });
    worksheet.addRow({
      nome: 'João Souza',
      email_institucional: 'joao.souza@instituicao.edu.br',
      vinculo: 'SERVIDOR',
      setor_papel: sectorNames[0] ?? '',
    });
    worksheet.addRow({
      nome: 'Ana Pereira',
      email_institucional: 'ana.pereira@instituicao.edu.br',
      vinculo: 'PROFESSOR',
      setor_papel: USERS_IMPORT_ADMIN_ROLE_VALUE,
    });

    const sectorRoleColumnIndex = USERS_IMPORT_TEMPLATE_COLUMNS.indexOf('setor_papel') + 1;
    const sectorRoleColumnLetter = worksheet.getColumn(sectorRoleColumnIndex).letter;
    const headerCell = worksheet.getCell(`${sectorRoleColumnLetter}1`);
    headerCell.note =
      'Vazio = Solicitante. Nome de um setor cadastrado = papel Setor, vinculado a ele. ' +
      'ADMIN = Administrador.';

    this.addSectorRoleListSheet(workbook, allowedValues);
    this.addDataValidation(worksheet, sectorRoleColumnLetter, allowedValues.length);
    this.addInstructionsSheet(workbook);

    const buffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer);
  }

  // A dynamic dropdown list needs a real range to point at — ExcelJS has no
  // "inline list of N dynamic values" validation, so the values live on a
  // hidden auxiliary sheet and the dropdown references that range.
  private addSectorRoleListSheet(workbook: ExcelJS.Workbook, allowedValues: string[]): void {
    const listSheet = workbook.addWorksheet(SECTOR_LIST_SHEET_NAME, { state: 'veryHidden' });

    allowedValues.forEach((value, index) => {
      listSheet.getCell(index + 1, 1).value = value;
    });
  }

  private addDataValidation(
    worksheet: ExcelJS.Worksheet,
    columnLetter: string,
    valuesCount: number,
  ): void {
    const range = `${SECTOR_LIST_SHEET_NAME}!$A$1:$A$${Math.max(valuesCount, 1)}`;

    worksheet.dataValidations.add(`${columnLetter}2:${columnLetter}${MAX_VALIDATED_ROW}`, {
      type: 'list',
      allowBlank: true,
      formulae: [`=${range}`],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Papel/setor inválido',
      error: 'Selecione um valor da lista: deixe em branco, um setor cadastrado ou ADMIN.',
    });
  }

  private addInstructionsSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet(INSTRUCTIONS_SHEET_NAME);

    sheet.columns = [{ width: 40 }, { width: 80 }];

    sheet.addRow(['Coluna', 'setor_papel']);
    sheet.addRow(['Vazio', 'O usuário é cadastrado apenas como Solicitante.']);
    sheet.addRow([
      'Nome de um setor cadastrado',
      'O usuário recebe o papel Setor, vinculado ao setor informado.',
    ]);
    sheet.addRow([
      USERS_IMPORT_ADMIN_ROLE_VALUE,
      'O usuário recebe o papel Administrador.',
    ]);

    sheet.getRow(1).font = { bold: true };
  }
}
