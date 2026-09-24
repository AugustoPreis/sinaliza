import { Type } from '@nestjs/common';

import { IAuditFormatter, IAuditNormalizer, IAuditRelationResolver } from '../interfaces';
import { AuditMetadataRegistry } from '../registry/audit-metadata.registry';

export interface IAuditFieldOptions {
  label?: string;
  ignore?: boolean;
  formatter?: Type<IAuditFormatter>;
  normalizer?: Type<IAuditNormalizer>;
  relationResolver?: Type<IAuditRelationResolver>;
}

/**
 * Marks a property as audit-tracked and registers its metadata in the
 * `AuditMetadataRegistry`. Executes no logic beyond recording metadata.
 */
export function Audit(options?: IAuditFieldOptions): PropertyDecorator {
  return (target, propertyKey) => {
    AuditMetadataRegistry.registerField(target.constructor, {
      propertyName: String(propertyKey),
      label: options?.label,
      ignore: options?.ignore,
      formatter: options?.formatter,
      normalizer: options?.normalizer,
      relationResolver: options?.relationResolver,
    });
  };
}
