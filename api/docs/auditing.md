# Audit trail

Every change to an `@Audit()`-decorated field of an `@AuditEntity()`-decorated entity is captured
automatically, with no explicit code in the use-case that made the change, as long as the write
goes through `repo.save()`/`repo.remove()`/`repo.softRemove()` (never the query-builder style
`repo.update()`/`repo.delete()`/`repo.softDelete()`, which never loads the "before" value of the
change).

## Two parts: the generic engine vs. the persistence module

- **`shared/audit/`** is the engine: decorators, the metadata registry, the stage pipeline,
  formatters/normalizers/translator. Knows nothing about TypeORM or HTTP; reusable by any entity
  in any module.
- **`modules/audit/`** is the concrete part: the TypeORM subscriber, the event listener, the
  `AuditLogEntity` entity (schema `audit`, table `audit_logs`), the repository, the read/write
  use-cases, and the controller (`GET /v1/audit-logs`, `GET /v1/audit-logs/:uuid`, both behind
  `RequirePermission('audit', 'read')`).

## Decorating an entity

```ts
@AuditEntity({ name: 'user', module: 'users' })
@Entity('users')
export class UserEntity extends BaseEntity {
  @Audit()
  @Column({ length: 255, unique: true })
  email!: string;

  // Never audited: it's a secret, not just PII.
  @Audit({ ignore: true })
  @Column({ name: 'password_hash', type: 'text', select: false })
  passwordHash!: string;

  @Audit({ formatter: EnumFormatter })
  @Column({ type: 'enum', enum: EUserStatus, ... })
  status!: EUserStatus;
}
```

- `name` is the key used to look the entity back up later (on read); `module` is the i18n
  namespace where that entity type's labels/translations live (see below).
- Every field that should show up in the diff needs `@Audit()`. A field without the decorator is
  simply ignored (no error), but prefer `@Audit({ ignore: true })` with a comment explaining why
  whenever the omission isn't obvious (a secret, a relation the subscriber can't structurally
  observe, etc.), so it's clear it was a decision, not an oversight.

## Translating labels and enum values

Each module that owns an entity adds an `audit` block to its own locale file
(`core/i18n/locales/pt-BR/<module>.json`):

```json
{
  "audit": {
    "entities": {
      "user": {
        "label": "Usuário",
        "fields": { "name": "Nome", "email": "E-mail", "status": "Status" },
        "enums": { "status": { "ACTIVE": "Ativo", "INACTIVE": "Inativo" } }
      }
    }
  }
}
```

`I18nAuditTranslator` looks these keys up as `<module>.audit.entities.<name>.label` /
`.fields.<field>` / `.enums.<field>.<value>`. When adding a new auditable entity, add the matching
block to that module's locale file; without it, the label falls back to the raw field name,
untranslated.

## Adding a new formatter or normalizer

- **Normalizer** (`shared/audit/normalizers/`): normalizes the value _before_ the diff, so
  representation differences (array order, `undefined` vs. `null`, date type) don't produce a
  false-positive diff. Implement `IAuditNormalizer` and reference it on the field:
  `@Audit({ normalizer: MyNormalizer })`.
- **Formatter** (`shared/audit/formatters/`): formats the value _on read_, for display (e.g.
  `EnumFormatter` translates the enum value; `CurrencyFormatter`/`DateFormatter` use locale-aware
  `Intl`). Implement `IAuditFormatter` and reference it: `@Audit({ formatter: MyFormatter })`.
- **Relation resolver** (e.g. `PermissionsRelationResolver`): when the field is a relation and
  the raw diff (ids) isn't useful for display, an `IAuditRelationResolver` fetches the real records
  to format (e.g. turning a list of permission ids into `"users:read, users:write"`). Always pair
  it with `normalizer: ArrayNormalizer` if the field is a to-many relation, so ordering doesn't
  affect the diff.

Register the new class in `AuditEngineModule`'s `providers`
(`shared/audit/audit-engine.module.ts`). That's what lets any `FormatStage`/`NormalizeStage`/
`ResolveRelationsStage` resolve it dynamically via `ModuleRef.get(Type, { strict: false })`,
without the generic engine ever needing to import the domain module that owns the resolver.

## The pipeline, in two halves

**Write** (`AuditPipelineService.recordChange`, called by `RecordAuditLogUseCase` from the event
emitted by `AuditSubscriber`): `LoadMetadataStage → NormalizeStage → DiffStage`. Produces the
`IFieldDiff[]` (`{ field, old, new }`) persisted as `jsonb` in `audit.audit_logs`. If the diff
comes out empty (nothing actually changed after normalization), **no row is written**.

**Read** (`AuditPipelineService.buildChangeSet`, called by `AuditLogResponseMapper` when building
the HTTP response): `ResolveRelationsStage → TranslateStage → FormatStage → BuildDtoStage`. Takes
the already-persisted raw diff and turns it, for the current request's locale, into an
`AuditFieldChangeDTO[]` with a translated label and `{ value, display }` pairs (raw value + display
value) for both the "before" and "after" sides.

Failures degrade safely at any point: an entity with no `@AuditEntity()` falls back to an untranslated
raw diff; a relation resolver that fails keeps the raw value; and any error inside
`RecordAuditLogUseCase` is caught and logged by `AuditChangeListener` without affecting the
transaction/response of the original operation that triggered the audit.

## End-to-end (real example)

`UserEntity.status` changes from `ACTIVE` to `INACTIVE` via `UsersRepository.update()` (which does
a `repo.save()`):

1. `AuditSubscriber.afterUpdate` fires (it listens to every entity; ignores anything without
   `@AuditEntity()`), builds `before`/`after` restricted to the `@Audit()` fields, and emits
   `AUDIT_CHANGE_REQUESTED_EVENT` via `EventEmitter2` with the current actor
   (`RequestContextService`).
2. `AuditChangeListener` receives the event (asynchronously) and calls `RecordAuditLogUseCase`,
   which runs the write pipeline: `status` has no custom normalizer (falls back to
   `DefaultNormalizer`), and `DiffEngine` detects `'ACTIVE' !== 'INACTIVE'` → produces
   `{ field: 'status', old: 'ACTIVE', new: 'INACTIVE' }`. A row is written to `audit.audit_logs`.
3. Later, `GET /v1/audit-logs/:uuid` fetches that row and runs the read pipeline: `status` has
   `formatter: EnumFormatter`, which translates `ACTIVE`/`INACTIVE` via
   `users.audit.entities.user.enums.status.*` → `"Ativo"`/`"Inativo"`. The final response includes
   `{ field: "status", label: "Status", old: { value: "ACTIVE", display: "Ativo" }, new: { value:
"INACTIVE", display: "Inativo" } }`.

See also [testing.md](./testing.md): `test/integration/audit/audit-trail.integration-spec.ts`
proves this exact flow end-to-end against a real Postgres, subscriber included — it's the one
piece of this pipeline that can't be proven without the real TypeORM subscriber in the loop.
