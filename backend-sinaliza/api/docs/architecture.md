# Architecture

## Layers

Every HTTP resource follows the same path:

```
Controller → Use-case → Repository → Entity (TypeORM)
```

- **Controller**: thin. It only pulls data out of the request (`@Body`, `@Param`, `@Query`,
  `@CurrentUser`), applies the authorization decorators (`@RequirePermission`, or none, see
  [authorization.md](./authorization.md)), and delegates to a use-case. Never contains business
  logic.
- **Use-case**: one class per operation (`CreateUserUseCase`, `UpdateUserPasswordUseCase`,
  `UploadUserAvatarUseCase`, ...), each with a single public `execute(...)` method. This is where
  business logic lives: validation, decisions, orchestrating repositories/external services,
  raising `AppException` on failure.
- **Repository**: one class per entity (`UsersRepository`, `RolesRepository`, ...), wrapping all
  access to the TypeORM `Repository<T>`. Write methods use `repo.save()`/`repo.remove()`/
  `repo.softRemove()`, never `repo.update()`/`repo.delete()`/`repo.softDelete()` (query-builder
  style), because only the instance-based form populates `event.databaseEntity` on the TypeORM
  subscriber, which is what the audit trail relies on to know the "before" value of a change (see
  [auditing.md](./auditing.md)).
- **Entity**: the TypeORM mapping. Every domain entity extends `shared/entities/base.entity`
  (an internal incrementing `id`, a public `uuid`, `createdAt`/`updatedAt`/`deletedAt`). UUIDs used
  externally (routes, DTOs) are always `uuid`, never the numeric `id`: the `id` is strictly an
  internal database detail.

Request DTOs (`CreateUserDTO`, etc.) and response DTOs (`UserResponseDTO`, with a `static
from(entity)`) live in `dtos/` inside each module. See [conventions.md](./conventions.md).

## `core/` vs `shared/` vs `modules/`

- **`core/`** is application infrastructure: configuration (`core/config/*.config.ts` +
  `config.validation.ts`), the database (`core/database/`), i18n (`core/i18n/`), and external
  integrations wrapped in `@Global()` modules: `core/redis/`, `core/mail/`, `core/storage/`. A
  `core/` module typically exposes a single service (or a raw client behind a DI token, like
  `REDIS_CLIENT`) and is imported exactly once in `AppModule`; any other module can inject it
  freely without re-importing it, since it's global.
- **`shared/`** is application code reused across domain modules that isn't itself an external
  integration: guards (`JwtAuthGuard`, `PermissionsGuard`, `CsrfGuard`), decorators
  (`@CurrentUser`, `@RequirePermission`), exceptions (`AppException`), pipes, interceptors, plain
  services (`HashService`, `UuidService`), utils (`pagination.util.ts`, `object.util.ts`), and the
  audit engine (`shared/audit/`, see [auditing.md](./auditing.md)). Everything in `SharedModule` is
  `@Global()`.
- **`modules/`** is the actual domain resources (`users`, `roles`, `auth`, `audit`). Each follows
  the structure described in [modules.md](./modules.md) and only depends on `core/`, `shared/`,
  and occasionally another domain module (a direct import of its repository/entity, never its
  controller).

Practical rule for deciding where a new file goes: if it talks to an external system (SMTP, S3,
Redis, Postgres), it's `core/`. If it's application logic with no single domain owner, it's
`shared/`. If it belongs to a specific business resource, it's `modules/<resource>/`.

## When to delegate to smaller collaborators inside a complex use-case

Most use-cases are a single class with a straightforward `execute()` (see the pattern in
[modules.md](./modules.md)). Once a use-case grows to the point of coordinating several
independent steps, each one testable on its own, each one potentially varying by data type; it's
worth splitting it into smaller collaborators instead of one giant method full of `if`s.

The real example of this in the codebase is the **audit pipeline**
(`shared/audit/pipeline/`, detailed in [auditing.md](./auditing.md)): instead of a single
`AuditPipelineService` mixing all the diff/normalize/format/translate logic together, each step is
its own `@Injectable()` class (`LoadMetadataStage`, `NormalizeStage`, `DiffStage`,
`ResolveRelationsStage`, `TranslateStage`, `FormatStage`, `BuildDtoStage`), with a uniform
`execute(context) → context` signature, and the orchestrating service just chains the calls. No
per-field logic lives in it.

The most important part of the pattern: when a step's behavior needs to vary per field (each
entity field can have its own formatter/normalizer/relation-resolver, set via `@Audit({ formatter:
EnumFormatter })`), the step resolves the right class at runtime via `ModuleRef.get(ResolvedType, {
strict: false })` instead of a giant `switch`. This lets a domain module (e.g. `roles`) register
its own `PermissionsRelationResolver` without the generic engine (`AuditEngineModule`) ever needing
to know about `roles`: the engine only knows how to resolve "some `Type<IAuditFormatter>`"; who
that type actually is is up to whoever decorated the field.

Reach for this pattern when: (1) the logic has sequential steps independent enough to test in
isolation, and (2) part of the behavior needs to be pluggable by whoever consumes the mechanism,
without the orchestrator needing to know every variation up front. For the common case (a use-case
with a linear sequence of steps that doesn't need to be pluggable by third parties), a private
method per step is already enough; don't introduce a new class/file for that (see
`UpdateUserPasswordUseCase`, which handles this with simple private methods).

## What happens before the controller

`main.ts` registers, in this order: `helmet()`, `compression()`, `cookieParser()`, CORS
(`app.corsOrigin`), the global prefix (`api`) + URI versioning (`/v1/...`), a global
`ValidationPipe` (`whitelist`, `transform`, translated validation messages via
`i18nFieldValidationExceptionFactory`), and a global `HttpExceptionFilter` that serializes every
`HttpException` (including `AppException` and validation errors) into a single response envelope.

Global guards (`AppModule`, order matters: they run in the order they're listed in `providers`):
`AppThrottlerGuard` → `JwtAuthGuard` → `PermissionsGuard` → `CsrfGuard`. A public endpoint needs the
`@Public()` decorator; an endpoint that doesn't need granular RBAC (but still requires
authentication) simply omits `@RequirePermission` (see [authorization.md](./authorization.md)).
