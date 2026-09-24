# API documentation

Architecture and convention documentation, versioned alongside the code it describes. The
[root README](../../../README.md) only covers "how to run the project"; this is the "how it's
organized and why" layer.

- **[architecture.md](./architecture.md)**: the layers (controller → use-case → repository →
  entity), the difference between `core/`, `shared/`, and `modules/`, and when a complex use-case
  should delegate to smaller collaborators (using the audit pipeline as a real example).
- **[modules.md](./modules.md)**: how to scaffold a brand-new domain module: folders, module
  file, registration in `AppModule`, naming convention.
- **[configuration.md](./configuration.md)**: how to add a new environment variable:
  `*.config.ts`, `config.validation.ts`, and `.env.example`, and why validation is centralized.
- **[authorization.md](./authorization.md)**: RBAC: roles, permissions, effective permissions,
  `@RequirePermission`, `PermissionsGuard`.
- **[auditing.md](./auditing.md)**: the audit trail pipeline: diff → normalize → format →
  translate; how to add a new formatter/normalizer; `@AuditEntity`/`@Audit`.
- **[background-jobs.md](./background-jobs.md)**: BullMQ: how to register a queue, a processor,
  and the `defaultJobOptions`/retry convention.
- **[mailing.md](./mailing.md)**: how to create a new `.hbs` template, the shared partial/layout,
  and the rule "`MailService` is only called by `MailProcessor`".
- **[storage.md](./storage.md)**: `StorageService`, the object key convention, and the bucket
  policy difference between dev and production.
- **[conventions.md](./conventions.md)**: naming, request/response DTOs, i18n error messages,
  error handling via `AppException`, pagination.
- **[testing.md](./testing.md)**: the three test levels (unit, integration, e2e), where each one
  lives, and when to use each.
