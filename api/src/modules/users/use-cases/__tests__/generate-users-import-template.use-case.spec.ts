import * as ExcelJS from 'exceljs';

import { USERS_IMPORT_TEMPLATE_COLUMNS } from '../../constants/users-import.constants';
import { GenerateUsersImportTemplateUseCase } from '../generate-users-import-template.use-case';

describe('GenerateUsersImportTemplateUseCase', () => {
  const useCase = new GenerateUsersImportTemplateUseCase();

  it('generates an xlsx buffer with the official header columns', async () => {
    const buffer = await useCase.execute();

    expect(buffer).toBeInstanceOf(Buffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const worksheet = workbook.worksheets[0];
    const headerValues = USERS_IMPORT_TEMPLATE_COLUMNS.map((_, index) =>
      worksheet.getRow(1).getCell(index + 1).value,
    );

    expect(headerValues).toEqual([...USERS_IMPORT_TEMPLATE_COLUMNS]);
  });
});
