import { IAuditFieldMetadata } from '../../interfaces';
import { AuditMetadataRegistry } from '../audit-metadata.registry';

describe('AuditMetadataRegistry', () => {
  class Foo {}
  class Bar {}

  beforeEach(() => {
    AuditMetadataRegistry.clear();
  });

  describe('registerEntity', () => {
    it('registers a new entity, retrievable by target and by name', () => {
      const metadata = AuditMetadataRegistry.registerEntity(Foo, 'foo', 'foo-module', 'Foo label');

      expect(metadata).toEqual({
        target: Foo,
        name: 'foo',
        module: 'foo-module',
        label: 'Foo label',
        fields: new Map(),
      });
      expect(AuditMetadataRegistry.getByTarget(Foo)).toBe(metadata);
      expect(AuditMetadataRegistry.getByName('foo')).toBe(metadata);
    });

    it('registers without a label when none is given', () => {
      const metadata = AuditMetadataRegistry.registerEntity(Foo, 'foo', 'foo-module');

      expect(metadata.label).toBeUndefined();
    });

    it('updates module and label on an already-registered entity', () => {
      AuditMetadataRegistry.registerEntity(Foo, 'foo', 'foo-module', 'Old label');

      const metadata = AuditMetadataRegistry.registerEntity(
        Foo,
        'foo',
        'other-module',
        'New label',
      );

      expect(metadata.module).toBe('other-module');
      expect(metadata.label).toBe('New label');
    });

    it('preserves the previous label when registerEntity is called without one', () => {
      AuditMetadataRegistry.registerEntity(Foo, 'foo', 'foo-module', 'Kept label');

      const metadata = AuditMetadataRegistry.registerEntity(Foo, 'foo', 'other-module');

      expect(metadata.label).toBe('Kept label');
    });

    it('re-keys the byName index when the entity name changes', () => {
      AuditMetadataRegistry.registerEntity(Foo, 'oldName', 'foo-module');

      const metadata = AuditMetadataRegistry.registerEntity(Foo, 'newName', 'foo-module');

      expect(AuditMetadataRegistry.getByName('oldName')).toBeUndefined();
      expect(AuditMetadataRegistry.getByName('newName')).toBe(metadata);
    });

    it('keeps the same target entry in byTarget when the name changes', () => {
      AuditMetadataRegistry.registerEntity(Foo, 'oldName', 'foo-module');

      const metadata = AuditMetadataRegistry.registerEntity(Foo, 'newName', 'foo-module');

      expect(AuditMetadataRegistry.getByTarget(Foo)).toBe(metadata);
    });
  });

  describe('registerField', () => {
    it('lazily creates an entity when a field is registered before registerEntity runs', () => {
      const field: IAuditFieldMetadata = { propertyName: 'age' };

      AuditMetadataRegistry.registerField(Foo, field);

      const metadata = AuditMetadataRegistry.getByTarget(Foo);

      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('Foo');
      expect(metadata?.module).toBe('Foo');
      expect(metadata?.fields.get('age')).toBe(field);
      expect(AuditMetadataRegistry.getByName('Foo')).toBe(metadata);
    });

    it('reconciles the lazily-created entity once registerEntity runs afterwards', () => {
      const field: IAuditFieldMetadata = { propertyName: 'age' };

      AuditMetadataRegistry.registerField(Foo, field);
      const metadata = AuditMetadataRegistry.registerEntity(Foo, 'foo', 'foo-module', 'Foo label');

      expect(metadata.name).toBe('foo');
      expect(metadata.module).toBe('foo-module');
      expect(metadata.label).toBe('Foo label');
      expect(metadata.fields.get('age')).toBe(field);
      expect(AuditMetadataRegistry.getByName('Foo')).toBeUndefined();
      expect(AuditMetadataRegistry.getByName('foo')).toBe(metadata);
    });

    it('adds a field to an already-registered entity without touching module/label', () => {
      AuditMetadataRegistry.registerEntity(Foo, 'foo', 'foo-module', 'Foo label');
      const field: IAuditFieldMetadata = { propertyName: 'age' };

      AuditMetadataRegistry.registerField(Foo, field);

      const metadata = AuditMetadataRegistry.getByName('foo');

      expect(metadata?.module).toBe('foo-module');
      expect(metadata?.label).toBe('Foo label');
      expect(metadata?.fields.get('age')).toBe(field);
    });

    it('overwrites a field registered twice under the same property name', () => {
      const first: IAuditFieldMetadata = { propertyName: 'age', label: 'Old' };
      const second: IAuditFieldMetadata = { propertyName: 'age', label: 'New' };

      AuditMetadataRegistry.registerField(Foo, first);
      AuditMetadataRegistry.registerField(Foo, second);

      const metadata = AuditMetadataRegistry.getByTarget(Foo);

      expect(metadata?.fields.get('age')).toBe(second);
      expect(metadata?.fields.size).toBe(1);
    });

    it('keeps fields of different entities isolated from one another', () => {
      AuditMetadataRegistry.registerField(Foo, { propertyName: 'age' });
      AuditMetadataRegistry.registerField(Bar, { propertyName: 'title' });

      expect(AuditMetadataRegistry.getByTarget(Foo)?.fields.has('title')).toBe(false);
      expect(AuditMetadataRegistry.getByTarget(Bar)?.fields.has('age')).toBe(false);
    });
  });

  describe('getByTarget / getByName', () => {
    it('returns undefined for an unregistered target', () => {
      expect(AuditMetadataRegistry.getByTarget(Foo)).toBeUndefined();
    });

    it('returns undefined for an unregistered name', () => {
      expect(AuditMetadataRegistry.getByName('unknown')).toBeUndefined();
    });
  });

  describe('getAllNames', () => {
    it('returns the names of every registered entity', () => {
      AuditMetadataRegistry.registerEntity(Foo, 'foo', 'foo-module');
      AuditMetadataRegistry.registerEntity(Bar, 'bar', 'bar-module');

      expect(AuditMetadataRegistry.getAllNames()).toEqual(['foo', 'bar']);
    });

    it('returns an empty array when nothing is registered', () => {
      expect(AuditMetadataRegistry.getAllNames()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('empties both the byTarget and byName indexes', () => {
      AuditMetadataRegistry.registerEntity(Foo, 'foo', 'foo-module');

      AuditMetadataRegistry.clear();

      expect(AuditMetadataRegistry.getByTarget(Foo)).toBeUndefined();
      expect(AuditMetadataRegistry.getByName('foo')).toBeUndefined();
      expect(AuditMetadataRegistry.getAllNames()).toEqual([]);
    });
  });
});
