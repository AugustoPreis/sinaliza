import 'exceljs';

// `Worksheet.dataValidations` exists at runtime (see exceljs's
// lib/doc/worksheet.js) but isn't part of the published type definitions.
declare module 'exceljs' {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Worksheet {
    dataValidations: {
      add(address: string, validation: DataValidation): void;
      find(address: string): DataValidation | undefined;
      remove(address: string): void;
    };
  }
}
