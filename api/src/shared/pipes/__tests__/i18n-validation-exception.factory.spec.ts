import { ValidationError } from 'class-validator';
import { I18nContext } from 'nestjs-i18n';

import { AuditMetadataRegistry } from '@shared/audit/registry/audit-metadata.registry';

import {
  flattenValidationMessages,
  i18nFieldValidationExceptionFactory,
} from '../i18n-validation-exception.factory';

describe('flattenValidationMessages', () => {
  it('flattens constraint messages from a flat error list', () => {
    const errors = [
      {
        property: 'email',
        constraints: { isEmail: 'Email inválido' },
      } as unknown as ValidationError,
      {
        property: 'name',
        constraints: { isNotEmpty: 'Nome obrigatório' },
      } as unknown as ValidationError,
    ];

    expect(flattenValidationMessages(errors)).toEqual(['Email inválido', 'Nome obrigatório']);
  });

  it('flattens nested children messages depth-first', () => {
    const errors = [
      {
        property: 'address',
        children: [
          {
            property: 'city',
            constraints: { isNotEmpty: 'Cidade obrigatória' },
            children: [],
          },
        ],
      } as unknown as ValidationError,
    ];

    expect(flattenValidationMessages(errors)).toEqual(['Cidade obrigatória']);
  });

  it('returns an empty array for an empty error list', () => {
    expect(flattenValidationMessages([])).toEqual([]);
  });
});

describe('i18nFieldValidationExceptionFactory', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    AuditMetadataRegistry.clear();
  });

  it('returns an untranslated I18nValidationException when there is no active I18nContext', () => {
    jest.spyOn(I18nContext, 'current').mockReturnValue(undefined);
    const errors = [
      {
        property: 'email',
        constraints: { isEmail: 'validation.isEmail|{}' },
      } as unknown as ValidationError,
    ];

    const exception = i18nFieldValidationExceptionFactory(errors);

    expect(exception.errors).toBe(errors);
    expect(exception.errorsAlreadyTranslated).toBe(false);
  });

  it('translates each constraint and injects the registry field label', () => {
    class RoleDTO {}
    AuditMetadataRegistry.registerEntity(RoleDTO, 'role', 'roles');

    const translate = jest.fn((key: string) => key);
    jest.spyOn(I18nContext, 'current').mockReturnValue({ translate } as unknown as I18nContext);

    const errors = [
      {
        property: 'name',
        target: new RoleDTO(),
        constraints: { isNotEmpty: 'validation.isNotEmpty|{}' },
        children: [],
      } as unknown as ValidationError,
    ];

    const exception = i18nFieldValidationExceptionFactory(errors);

    expect(exception.errorsAlreadyTranslated).toBe(true);
    expect(translate).toHaveBeenCalledWith('roles.audit.entities.role.fields.name', {
      defaultValue: 'name',
    });
    expect(translate).toHaveBeenCalledWith('validation.isNotEmpty', {
      args: { field: 'roles.audit.entities.role.fields.name' },
    });
  });

  it('falls back to the raw property name when the entity is not registered', () => {
    const translate = jest.fn((key: string) => key);
    jest.spyOn(I18nContext, 'current').mockReturnValue({ translate } as unknown as I18nContext);

    class UnregisteredDTO {}
    const errors = [
      {
        property: 'nickname',
        target: new UnregisteredDTO(),
        constraints: { isString: 'validation.isString|{}' },
        children: [],
      } as unknown as ValidationError,
    ];

    i18nFieldValidationExceptionFactory(errors);

    expect(translate).toHaveBeenCalledWith('validation.isString', {
      args: { field: 'nickname' },
    });
  });
});
