import * as ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';

import { USERS_IMPORT_TEMPLATE_COLUMNS } from '../../constants/users-import.constants';
import { GenerateUsersImportTemplateUseCase } from '../generate-users-import-template.use-case';

describe('GenerateUsersImportTemplateUseCase', () => {
  const sectors = [{ name: 'TI' }, { name: 'Financeiro' }];
  const find = jest.fn().mockResolvedValue(sectors);
  const dataSource = {
    getRepository: jest.fn().mockReturnValue({ find }),
  } as unknown as DataSource;

  const useCase = new GenerateUsersImportTemplateUseCase(dataSource);

  it('generates an xlsx buffer with the official header columns', async () => {
    const buffer = await useCase.execute();

    expect(buffer).toBeInstanceOf(Buffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const worksheet = workbook.worksheets[0];
    const headerValues = USERS_IMPORT_TEMPLATE_COLUMNS.map(
      (_, index) => worksheet.getRow(1).getCell(index + 1).value,
    );

    expect(headerValues).toEqual([...USERS_IMPORT_TEMPLATE_COLUMNS]);
  });

  it('adds a dropdown data validation on setor_papel listing sector names and ADMIN', async () => {
    const buffer = await useCase.execute();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const worksheet = workbook.worksheets[0];
    const sectorRoleColumnIndex = USERS_IMPORT_TEMPLATE_COLUMNS.indexOf('setor_papel') + 1;
    const columnLetter = worksheet.getColumn(sectorRoleColumnIndex).letter;
    const validation = worksheet.dataValidations.find(`${columnLetter}2`);

    expect(validation).toBeDefined();
    expect(validation?.type).toBe('list');
  });

  it('includes an instructions sheet explaining the three possible values', async () => {
    const buffer = await useCase.execute();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const instructionsSheet = workbook.worksheets.find((sheet) => sheet.name === 'Instruções');

    expect(instructionsSheet).toBeDefined();
  });
});
