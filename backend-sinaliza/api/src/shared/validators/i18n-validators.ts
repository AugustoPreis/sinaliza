import {
  IsArray as _IsArray,
  IsEmail as _IsEmail,
  IsEnum as _IsEnum,
  IsNotEmpty as _IsNotEmpty,
  IsString as _IsString,
  IsUUID as _IsUUID,
  IsUrl as _IsUrl,
  Length as _Length,
  Matches as _Matches,
  MaxLength as _MaxLength,
  MinLength as _MinLength,
  ValidationOptions,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * Thin wrappers around the `class-validator` decorators actually used across
 * this repo's DTOs, each pre-wired to the matching generic message in
 * `validation.json` (keyed by the constraint's own name, e.g. `isLength`,
 * `minLength`) via `i18nValidationMessage`. Callers can still override
 * `options.message` per field (see `Matches` usage in create-permission.dto).
 * The translated field label ("Nome", "Descrição"...) is injected centrally
 * by `i18nFieldValidationExceptionFactory`, not here.
 */

export function IsNotEmpty(options?: ValidationOptions): PropertyDecorator {
  return _IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty'), ...options });
}

export function IsString(options?: ValidationOptions): PropertyDecorator {
  return _IsString({ message: i18nValidationMessage('validation.isString'), ...options });
}

export function IsEmail(
  emailOptions?: Parameters<typeof _IsEmail>[0],
  options?: ValidationOptions,
): PropertyDecorator {
  return _IsEmail(emailOptions, {
    message: i18nValidationMessage('validation.isEmail'),
    ...options,
  });
}

export function IsUrl(
  urlOptions?: Parameters<typeof _IsUrl>[0],
  options?: ValidationOptions,
): PropertyDecorator {
  return _IsUrl(urlOptions, { message: i18nValidationMessage('validation.isUrl'), ...options });
}

export function IsUUID(
  version?: Parameters<typeof _IsUUID>[0],
  options?: ValidationOptions,
): PropertyDecorator {
  return _IsUUID(version, { message: i18nValidationMessage('validation.isUuid'), ...options });
}

export function IsArray(options?: ValidationOptions): PropertyDecorator {
  return _IsArray({ message: i18nValidationMessage('validation.isArray'), ...options });
}

export function IsEnum(entity: object, options?: ValidationOptions): PropertyDecorator {
  return _IsEnum(entity, { message: i18nValidationMessage('validation.isEnum'), ...options });
}

export function Length(min: number, max?: number, options?: ValidationOptions): PropertyDecorator {
  return _Length(min, max, {
    message: i18nValidationMessage('validation.isLength', { min, max }),
    ...options,
  });
}

export function MinLength(min: number, options?: ValidationOptions): PropertyDecorator {
  return _MinLength(min, {
    message: i18nValidationMessage('validation.minLength', { min }),
    ...options,
  });
}

export function MaxLength(max: number, options?: ValidationOptions): PropertyDecorator {
  return _MaxLength(max, {
    message: i18nValidationMessage('validation.maxLength', { max }),
    ...options,
  });
}

export function Matches(pattern: RegExp, options?: ValidationOptions): PropertyDecorator {
  return _Matches(pattern, { message: i18nValidationMessage('validation.matches'), ...options });
}
