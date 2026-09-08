# Testing

Three levels, each with a different boundary, infra requirement, and file location. Deciding
which level a new test belongs to comes down to one question: **can every dependency be mocked
without losing what's actually being validated?**

| Level           | What it validates                                                                           | Infra                          | File suffix             | Location                      |
| --------------- | ------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------- | ----------------------------- |
| **Unit**        | Pure logic of one class/function, isolated via mocks                                        | None                           | `*.spec.ts`             | `__tests__/` next to the code |
| **Integration** | One real piece of infra (Postgres, Redis/BullMQ, S3) behaves as expected                    | Testcontainers                 | `*.integration-spec.ts` | `test/integration/<module>/`  |
| **E2E**         | A full HTTP flow (`POST /v1/...` → status + body + cookies), through the real global guards | Testcontainers + real Nest app | `*.e2e-spec.ts`         | `test/e2e/`                   |

If every dependency can be mocked without losing what's being tested → unit. If the dependency is
a real SQL behavior (`ILike`, `relations`, constraints, the `AuditSubscriber` fired by `save()`), a
real storage policy, or a real queue roundtrip → integration. If what matters is the externally
observable behavior, through the real global guards → e2e.

## Repositories: integration only, never unit

`UsersRepository`, `RolesRepository`, etc. are thin wrappers over `Repository<T>` with methods
using `createQueryBuilder`, `relations`, `ILike`, `IsNull`. Mocking `Repository<T>`/
`SelectQueryBuilder<T>` to test these would only test the mock's call chain, not whether the query
actually filters/joins what it should. Every `*.repository.ts` gets an integration spec against a
real Postgres, never a unit spec.

## Controllers: e2e only, never unit

Every controller in this project is intentionally thin (extract request, apply authorization
decorators, delegate to a use-case — see [architecture.md](./architecture.md)). A unit test for a
controller degrades to "mock the use-case, call the method, assert it was called" — no plausible
bug that an e2e test (which exercises the controller for real, through the real global guards)
wouldn't already catch with more confidence. No controller gets a dedicated unit spec; coverage
comes from its module's e2e spec. The one exception is `HealthController`: it has no use-case to
delegate to (the "business logic" and the "controller" are the same class), so it gets a unit spec
like any other class with real logic.

## Where each level lives, and the `__tests__/` convention

Unit specs live in a `__tests__/` folder **inside the same directory as the code they cover** (one
`__tests__/` folder per directory, not one file per source file), for example:

```
modules/users/
  use-cases/
    __tests__/
      create-user.use-case.spec.ts
      update-user.use-case.spec.ts
    create-user.use-case.ts
    update-user.use-case.ts
```

This is a deliberate middle ground between colocation (`create-user.use-case.spec.ts` right next
to the file — what Nest's own CLI generates, but it doubles the file count of every module folder)
and a fully mirrored tree under `test/unit/...` (keeps modules clean, but moves the test far enough
from the code that renaming/deleting a file means remembering to do the same somewhere else — the
classic way unit specs rot unnoticed). Moving or deleting a feature moves/deletes its `__tests__/`
folder with it, and no config change is needed for a new one: the unit Jest config already has
`rootDir: "src"` and `testRegex: ".*\.spec\.ts$"` (`package.json`), which matches any `.spec.ts` at
any depth under `src/`.

Integration and e2e specs are NOT colocated with source — they live in `test/`, which
already exists for this purpose:

```
test/
  support/            # shared harness: containers, test DataSource, factories, loginAs, etc.
  integration/<module>/*.integration-spec.ts
  e2e/*.e2e-spec.ts
```

Grouped by normalizer/formatter is the one deliberate exception inside unit tests: `audit/
normalizers/__tests__/normalizers.spec.ts` and `audit/formatters/__tests__/formatters.spec.ts` are
each a single spec file with one `describe` per normalizer/formatter, since they're small and
share the exact same shape. `audit/pipeline/stages/*.stage.ts` is the opposite: one spec per
stage, since each stage has its own responsibility and its own input/output context shape.

## What never gets a test, and why

- `*.module.ts` everywhere — DI wiring, implicitly proven by any integration/e2e spec that boots
  the real `AppModule`/a real module.
- `*.entity.ts`, `*.interface.ts`, DTOs with no `static from()`/logic — nothing to break;
  `class-validator` decorator validation is proven by e2e (the real `ValidationPipe` rejecting an
  invalid payload) instead of re-implementing `class-validator` in a unit test.
- `core/config/*.config.ts` (except `config.validation.ts`) — just `registerAs(() => ({...}))`
  reading `process.env`, no branch.
- `core/database/data-source.ts`, `migrations/**`, `seeds/**` — proven by being the actual target
  of `test/support/test-data-source.ts`: a broken migration fails every integration/e2e spec at
  boot, which is signal enough without duplicating it in a unit test.
- `core/redis/redis.module.ts`, `core/storage/storage.module.ts` — client factories, covered by the
  app's own boot in integration/e2e.
- `shared/logger/logger.service.ts` — not registered in any imported module today (see
  [conventions.md](./conventions.md), Logging section); testing dead, unwired code is wasted
  effort. Revisit if/when it gets wired into DI.
- Simple decorators (`@CurrentUser`, `@Public`, `@RequirePermission`, `@SkipCsrf`) —
  `createParamDecorator`/`SetMetadata` with no branch; already covered by the guards that read the
  same metadata, and by e2e.

## `test/support/`: the shared harness

Everything integration/e2e specs reuse instead of re-implementing container/app setup per file:

| File                  | What it gives you                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `containers.ts`       | `startContainers(opts)`/`stopContainers(containers)` — Postgres/Redis always; MinIO/MailHog only when `{ minio: true }`/`{ mailhog: true }` is passed (most specs don't need them). Called once per test **file** in `beforeAll`, not in a Jest `globalSetup` — each file is independent and can run in parallel with no shared-state risk.                                                                                                                 |
| `test-data-source.ts` | `createTestDataSource(postgres)` — a real `DataSource` against the container, migrated (`runMigrations()`, never `synchronize: true`).                                                                                                                                                                                                                                                                                                                      |
| `db-cleaner.ts`       | `cleanDatabase(dataSource)` — `TRUNCATE` every table (derived from `entityMetadatas`, not hardcoded), called in `beforeEach` for specs that write to the DB.                                                                                                                                                                                                                                                                                                |
| `entity-factories.ts` | `buildUser()`/`buildRole()`/`buildPermission()`/`buildAuditLog()` — plain data objects with realistic fakes (`@faker-js/faker`) and a real `uuid` v7 already set, ready for `repo.save()`. Generates data, not static fixtures.                                                                                                                                                                                                                             |
| `mock-repository.ts`  | `createMockRepository<T>()` — a `jest-mock-extended` deep mock of `Repository<T>`, for unit specs that need to mock a raw TypeORM repository directly (rare — most use-cases depend on the project's own `*Repository` wrapper class instead, mocked with plain `mockDeep<T>()`).                                                                                                                                                                           |
| `test-app.helper.ts`  | `bootstrapTestApp(options)` — boots the real `AppModule` via `Test.createTestingModule`, pointed at the test containers via env vars (set _before_ compiling, so `ConfigService` picks them up), with the same global pipes/filters/guards/versioning `main.ts` applies in production. `S3_CLIENT` is always overridden with a `mockDeep<S3Client>()` — e2e proves the HTTP flow, not the S3 protocol (that's `storage.service.integration-spec.ts`'s job). |
| `auth.helper.ts`      | `loginAs(app, credentials)` — logs in via `supertest.agent` (keeps cookies across requests) and returns `{ agent, csrfHeader }`, ready to inject into every mutating request.                                                                                                                                                                                                                                                                               |
| `jest.setup.ts`       | Forces IPv4 DNS resolution (`dns.setDefaultResultOrder('ipv4first')`). Without it, on hosts where `localhost` resolves to `::1` first (WSL2 among them), any client that doesn't force IPv4 itself (ioredis/BullMQ, unlike `pg`) hangs on `ETIMEDOUT` against a container that's actually reachable on IPv4. Wired as a `setupFiles` entry in both `jest-integration.json` and `jest-e2e.json`.                                                             |

### A config trap worth knowing about if a test seems to ignore an env override

`AppModule` uses `ConfigModule.forRoot({ validate: validateConfig, ... })`. `ConfigService.get()`
prefers a **snapshot of the whole environment taken once at import time** (built from
`validate()`'s return value) over live `process.env`, for any key that isn't wrapped in a
`registerAs(...)` namespace. Setting `process.env.SOME_HOST` right before `bootstrapTestApp` has
no effect on a value read as a bare key (`config.get('SOME_HOST')`) — it only works for values
read through a namespace (`config.get('database.host')`), because those factories run lazily,
during module instantiation, not at import time. This is why every external service's config
(`database`, `auth`, `mail`, `redis`, `storage`) is a `registerAs(...)` file under `core/config/` —
if a new one is added as a bare `process.env.X` read instead, it will work in production but can
never be overridden after the app has already imported `AppModule` once, tests included.

## Running the suites

```bash
pnpm test              # unit — fast, no Docker
pnpm test:integration   # integration — needs Docker
pnpm test:e2e           # e2e — needs Docker
pnpm test:all           # all three, in that order
```

Integration/e2e run with `--runInBand` (each spec file starts its own containers; running files in
parallel would multiply the number of simultaneous containers for no benefit) and `--forceExit`
(BullMQ/ioredis can leave a socket open past `app.close()` even when nothing is actually leaking a
resource across test runs; this is a known, accepted rough edge, not silently swallowing real
in-suite failures — assertions still fail normally before `forceExit` is ever reached).

Unit tests enforce a coverage floor (`coverageThreshold` in `package.json`: 70% branches, 75%
functions, 80% lines/statements); `collectCoverageFrom` excludes everything listed in
"What never gets a test" above, so the threshold reflects code that's actually expected to carry
its own unit test.
