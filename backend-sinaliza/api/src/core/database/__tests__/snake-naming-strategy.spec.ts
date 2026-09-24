import { SnakeCaseNamingStrategy } from '../snake-naming-strategy';

describe('SnakeCaseNamingStrategy', () => {
  const strategy = new SnakeCaseNamingStrategy();

  describe('tableName', () => {
    it('converts a PascalCase entity name to snake_case', () => {
      expect(strategy.tableName('UserProfile', undefined)).toBe('user_profile');
    });

    it('respects a user-specified table name', () => {
      expect(strategy.tableName('UserProfile', 'custom_users')).toBe('custom_users');
    });
  });

  describe('columnName', () => {
    it('converts a camelCase property name to snake_case', () => {
      expect(strategy.columnName('firstName', undefined, [])).toBe('first_name');
    });

    it('respects a custom column name', () => {
      expect(strategy.columnName('firstName', 'custom_first_name', [])).toBe('custom_first_name');
    });

    it('prefixes with the snake_cased embedded path when present', () => {
      expect(strategy.columnName('street', undefined, ['homeAddress'])).toBe('home_address_street');
    });

    it('joins multiple embedded prefixes before the property name', () => {
      expect(strategy.columnName('zipCode', undefined, ['homeAddress', 'billing'])).toBe(
        'home_address_billing_zip_code',
      );
    });
  });

  describe('relationName', () => {
    it('converts a camelCase relation property name to snake_case', () => {
      expect(strategy.relationName('createdByUser')).toBe('created_by_user');
    });
  });

  describe('joinColumnName', () => {
    it('combines the relation name and referenced column into snake_case', () => {
      expect(strategy.joinColumnName('createdByUser', 'id')).toBe('created_by_user_id');
    });
  });

  describe('joinTableName', () => {
    it('combines both table names and the owning property into snake_case', () => {
      expect(strategy.joinTableName('UserRole', 'Permission', 'permissions')).toBe(
        'user_role_permission_permissions',
      );
    });
  });

  describe('joinTableColumnName', () => {
    it('combines table name and property name into snake_case when no column name is given', () => {
      expect(strategy.joinTableColumnName('UserRole', 'permissionId', undefined)).toBe(
        'user_role_permission_id',
      );
    });

    it('prefers the explicit column name over the property name', () => {
      expect(strategy.joinTableColumnName('UserRole', 'permissionId', 'roleId')).toBe(
        'user_role_role_id',
      );
    });
  });
});
