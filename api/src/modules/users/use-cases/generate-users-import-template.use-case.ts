import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

import { USERS_IMPORT_SHEET_NAME, USERS_IMPORT_TEMPLATE_COLUMNS } from '../constants/users-import.constants';

@Injectable()
export class GenerateUsersImportTemplateUseCase {
  async execute(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(USERS_IMPORT_SHEET_NAME);

    worksheet.columns = USERS_IMPORT_TEMPLATE_COLUMNS.map((header) => ({ header, key: header, width: 28 }));

    worksheet.addRow({
      nome: 'Maria Silva',
      email_institucional: 'maria.silva@instituicao.edu.br',
      vinculo: 'ALUNO',
      setor_papel: '',
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer);
  }
}
