import { mockDeep } from 'jest-mock-extended';
import { I18nService } from 'nestjs-i18n';

import { I18nAuditTranslator } from '../i18n-audit.translator';

describe('I18nAuditTranslator', () => {
  describe('translateEntity', () => {
    it('resolves the translated label when the i18n key exists', () => {
      const i18n = mockDeep<I18nService>();
      i18n.translate.mockReturnValue('Usuário');
      const translator = new I18nAuditTranslator(i18n);

      const result = translator.translateEntity('users', 'user', 'pt-BR', 'user');

      expect(result).toBe('Usuário');
      expect(i18n.translate).toHaveBeenCalledWith('users.audit.entities.user.label', {
        lang: 'pt-BR',
        defaultValue: 'user',
      });
    });

    it('falls back to the given fallback when the translation key does not exist', () => {
      const i18n = mockDeep<I18nService>();
      i18n.translate.mockImplementation((_key, options) => options?.defaultValue);
      const translator = new I18nAuditTranslator(i18n);

      const result = translator.translateEntity('users', 'user', 'pt-BR', 'User');

      expect(result).toBe('User');
    });

    it('falls back to the raw entity name when no fallback is given', () => {
      const i18n = mockDeep<I18nService>();
      i18n.translate.mockImplementation((_key, options) => options?.defaultValue);
      const translator = new I18nAuditTranslator(i18n);

      const result = translator.translateEntity('users', 'user', 'pt-BR');

      expect(result).toBe('user');
    });
  });

  describe('translateField', () => {
    it('resolves the translated label when the i18n key exists', () => {
      const i18n = mockDeep<I18nService>();
      i18n.translate.mockReturnValue('Nome');
      const translator = new I18nAuditTranslator(i18n);

      const result = translator.translateField('users', 'user', 'name', 'pt-BR', 'name');

      expect(result).toBe('Nome');
      expect(i18n.translate).toHaveBeenCalledWith('users.audit.entities.user.fields.name', {
        lang: 'pt-BR',
        defaultValue: 'name',
      });
    });

    it('falls back to the raw field name when the translation key does not exist', () => {
      const i18n = mockDeep<I18nService>();
      i18n.translate.mockImplementation((_key, options) => options?.defaultValue);
      const translator = new I18nAuditTranslator(i18n);

      const result = translator.translateField('users', 'user', 'name', 'pt-BR');

      expect(result).toBe('name');
    });
  });

  describe('translateEnum', () => {
    it('resolves the translated label when the i18n key exists', () => {
      const i18n = mockDeep<I18nService>();
      i18n.translate.mockReturnValue('Ativo');
      const translator = new I18nAuditTranslator(i18n);

      const result = translator.translateEnum(
        'users',
        'user',
        'status',
        'ACTIVE',
        'pt-BR',
        'ACTIVE',
      );

      expect(result).toBe('Ativo');
      expect(i18n.translate).toHaveBeenCalledWith('users.audit.entities.user.enums.status.ACTIVE', {
        lang: 'pt-BR',
        defaultValue: 'ACTIVE',
      });
    });

    it('falls back to the raw enum value when the translation key does not exist', () => {
      const i18n = mockDeep<I18nService>();
      i18n.translate.mockImplementation((_key, options) => options?.defaultValue);
      const translator = new I18nAuditTranslator(i18n);

      const result = translator.translateEnum('users', 'user', 'status', 'ACTIVE', 'pt-BR');

      expect(result).toBe('ACTIVE');
    });
  });
});
