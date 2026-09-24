import { ValidationError } from '@nestjs/common';
import { I18nContext, I18nValidationException } from 'nestjs-i18n';

import { IAuditEntityMetadata } from '@shared/audit/interfaces';
import { AuditMetadataRegistry } from '@shared/audit/registry/audit-metadata.registry';

/**
 * Infers which audited entity a DTO validates from its class name alone
 * (`CreateRoleDTO` / `UpdateRoleDTO` / `ListRoleDTO` -> `role`), so a new DTO
 * needs zero extra config to get translated field labels in its validation
 * errors; it just has to be named the way every DTO in this repo already is.
 */
const DTO_SUFFIXES = ['DTO', 'Dto'];
const QUERY_SUFFIXES = ['Query', 'Filter'];
const DTO_PREFIXES = ['Create', 'Update', 'Partial', 'Replace', 'Patch', 'List', 'Assign'];

function stripSuffix(value: string, suffixes: string[]): string {
  const match = suffixes.find((suffix) => value.endsWith(suffix));
  return match ? value.slice(0, value.length - match.length) : value;
}

function stripPrefix(value: string, prefixes: string[]): string {
  const match = prefixes.find((prefix) => value.startsWith(prefix) && value.length > prefix.length);
  return match ? value.slice(match.length) : value;
}

function inferEntityName(target: unknown): string | undefined {
  const className = (target as { constructor?: { name?: string } } | undefined)?.constructor?.name;
  if (!className) return undefined;

  const base = stripPrefix(
    stripSuffix(stripSuffix(className, DTO_SUFFIXES), QUERY_SUFFIXES),
    DTO_PREFIXES,
  );
  if (!base) return undefined;

  return base.charAt(0).toLowerCase() + base.slice(1);
}

/**
 * Exact registry match first (`role`, `permission`, `user`...); otherwise
 * falls back to the longest registered entity name that the inferred name
 * starts with (`userStatus` -> `user`, `permissionKey` -> `permission`),
 * so DTOs whose class name carries an extra qualifier still resolve.
 */
function resolveEntityMeta(entityName?: string): IAuditEntityMetadata | undefined {
  if (!entityName) return undefined;

  const exact = AuditMetadataRegistry.getByName(entityName);
  if (exact) return exact;

  const [closest] = AuditMetadataRegistry.getAllNames()
    .filter((name) => entityName.startsWith(name))
    .sort((a, b) => b.length - a.length);

  return closest ? AuditMetadataRegistry.getByName(closest) : undefined;
}

function translateField(i18n: I18nContext, target: unknown, property: string): string {
  const meta = resolveEntityMeta(inferEntityName(target));
  if (!meta) return property;

  return i18n.translate(`${meta.module}.audit.entities.${meta.name}.fields.${property}`, {
    defaultValue: property,
  });
}

function translateConstraints(error: ValidationError, i18n: I18nContext): Record<string, string> {
  const field = translateField(i18n, error.target, error.property);

  return Object.entries(error.constraints ?? {}).reduce<Record<string, string>>(
    (result, [key, raw]) => {
      const separatorIndex = raw.indexOf('|');
      const translationKey = separatorIndex === -1 ? raw : raw.slice(0, separatorIndex);
      const argsString = separatorIndex === -1 ? '' : raw.slice(separatorIndex + 1);

      let args: Record<string, unknown> = {};
      if (argsString) {
        try {
          args = JSON.parse(argsString);
        } catch {
          args = {};
        }
      }

      result[key] = i18n.translate(translationKey, { args: { ...args, field } });
      return result;
    },
    {},
  );
}

function formatErrors(errors: ValidationError[], i18n: I18nContext): ValidationError[] {
  return errors.map((error) => {
    if (error.constraints) {
      error.constraints = translateConstraints(error, i18n);
    }

    error.children = formatErrors(error.children ?? [], i18n);

    return error;
  });
}

/**
 * Drop-in replacement for `nestjs-i18n`'s `i18nValidationErrorFactory`: same
 * "key|argsJSON" message format produced by `i18nValidationMessage`, but also
 * resolves and injects a translated `field` label into every constraint's
 * args before translating, via `translateField` above.
 */
export function i18nFieldValidationExceptionFactory(
  errors: ValidationError[],
): I18nValidationException {
  const i18n = I18nContext.current();

  if (!i18n) return new I18nValidationException(errors);

  return new I18nValidationException(formatErrors(errors, i18n), undefined, true);
}

/**
 * Flattens a (possibly nested) `ValidationError[]` tree (as translated by
 * `i18nFieldValidationExceptionFactory`) into a plain list of message
 * strings, so API error responses only ever carry a string or a string[],
 * never the internal `property`/`target`/`constraints` shape.
 */
export function flattenValidationMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...flattenValidationMessages(error.children ?? []),
  ]);
}
