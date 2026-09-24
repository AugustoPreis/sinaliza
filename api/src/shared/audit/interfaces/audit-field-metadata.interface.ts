import { Type } from '@nestjs/common';

import { IAuditFormatter } from './audit-formatter.interface';
import { IAuditNormalizer } from './audit-normalizer.interface';
import { IAuditRelationResolver } from './audit-relation-resolver.interface';

export interface IAuditFieldMetadata {
  propertyName: string;
  label?: string;
  ignore?: boolean;
  formatter?: Type<IAuditFormatter>;
  normalizer?: Type<IAuditNormalizer>;
  relationResolver?: Type<IAuditRelationResolver>;
}
