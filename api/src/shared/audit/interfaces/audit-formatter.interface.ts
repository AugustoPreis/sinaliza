export interface IAuditFormatContext {
  module: string;
  entityName: string;
  field: string;
  locale: string;
}

export interface IAuditFormatter<T = unknown> {
  format(value: T, context: IAuditFormatContext): string | Promise<string>;
}
