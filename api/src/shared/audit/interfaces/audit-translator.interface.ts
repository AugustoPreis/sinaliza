export interface IAuditTranslator {
  translateEntity(module: string, entityName: string, locale: string, fallback?: string): string;
  translateField(
    module: string,
    entityName: string,
    field: string,
    locale: string,
    fallback?: string,
  ): string;
  translateEnum(
    module: string,
    entityName: string,
    field: string,
    value: string,
    locale: string,
    fallback?: string,
  ): string;
}
