# Configuration

## Adding a new environment variable

1. **`.env.example`**: add the variable with a safe/example value, grouped with related variables
   (e.g. a new `# Storage` block). If the variable has a real, sensitive production counterpart,
   make that clear in a comment (e.g. `# true in production, false in development`).
2. **`core/config/<something>.config.ts`**: expose the variable via `registerAs('<namespace>', ()
=> ({ ... }))`, reading from `process.env.MY_VAR` with a sensible development default:

   ```ts
   import { registerAs } from '@nestjs/config';

   export default registerAs('myFeature', () => ({
     something: process.env.MY_VAR || 'default-dev',
   }));
   ```

   Access it afterwards from any service via `ConfigService.get<string>('myFeature.something')`,
   not `process.env` directly: this keeps env reads centralized and testable. The project's real
   exceptions are code that runs outside Nest's DI graph (the TypeORM CLI data source in
   `core/database/data-source.ts`, the seeders in `core/database/seeds/`) and a couple of one-off
   `NODE_ENV` checks made before `ConfigService` is available (inside module factories, like
   `LoggerModule.forRootAsync` and `I18nModule`). Don't replicate that for a new feature's env
   var; it's only justified in those two specific cases.

3. **`core/config/index.ts`**: export the new config (`export { default as myFeatureConfig } from
'./my-feature.config';`).
4. **`app.module.ts`**: add it to the `load: [...]` array of `ConfigModule.forRoot(...)`.
5. **`config.validation.ts`**, if the variable is required in production, add a check inside the
   `if (env === 'production')` block, following the pattern already used for the JWT secrets and
   the S3 credentials (presence/minimum length, pushing an error onto the `errors` list). This
   makes the boot fail fast (with a clear message) instead of the application coming up "broken"
   in production because of a missing env var.

### Exception: Redis

`core/redis/redis.module.ts` reads `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`/`REDIS_DB` directly
off `ConfigService`, with no `redis.config.ts` via `registerAs`: this is a historical
inconsistency from the project's oldest module, not the pattern to follow.
`BullModule.forRootAsync` (see [background-jobs.md](./background-jobs.md)) reuses those same
variables for the same reason (it's the same underlying Redis connection). For any new
configuration, follow the `registerAs` pattern above, not Redis's.

## Updating the `docker-compose.yml` images

Dependabot handles npm dependencies, GitHub Actions, and `Dockerfile`'s base image (see
`.github/dependabot.yml`), but it doesn't read `docker-compose.yml`. The development
infrastructure images (`postgres`, `redis:7-alpine`, `minio/minio`) fall outside that automation
and need an occasional manual bump, checking the pinned tag on each service against the latest
stable release.

## Why validation lives in a single file

`config.validation.ts` is passed as `validate` to `ConfigModule.forRoot(...)` and runs once, at
boot. Keeping every "this is required/must have this shape in production" rule in one place
(instead of scattered across each `*.config.ts` or lazily checked in every service that reads the
variable) means: (1) the application never comes up in a half-configured state: either every rule
passes, or the process never starts; (2) to know everything required in production, a single file
answers the question, with no need to grep the whole project.
