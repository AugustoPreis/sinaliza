# General conventions

## File and class naming

| Piece            | File                              | Class                                     |
| ---------------- | --------------------------------- | ----------------------------------------- |
| Controller       | `<resource>.controller.ts`        | `<Resource>Controller`                    |
| Use-case         | `<action>-<resource>.use-case.ts` | `<Action><Resource>UseCase`               |
| Repository       | `<resource>s.repository.ts`       | `<Resource>sRepository`                   |
| Entity           | `<resource>.entity.ts`            | `<Resource>Entity`                        |
| Request DTO      | `<action>-<resource>.dto.ts`      | `<Action><Resource>DTO`                   |
| Response DTO     | `<resource>-response.dto.ts`      | `<Resource>ResponseDTO`                   |
| Enum             | `<resource>-<field>.enum.ts`      | `E<Resource><Field>` (e.g. `EUserStatus`) |
| Pure util/helper | `<something>.util.ts`             | exported function, not a class            |
| Interface        | `<something>.interface.ts`        | `I<Something>`                            |
| Unit spec        | `<subject>.spec.ts`               | in `__tests__/` next to the code          |
| Integration spec | `<subject>.integration-spec.ts`   | in `test/integration/<module>/`           |
| E2E spec         | `<module>.e2e-spec.ts`            | in `test/e2e/`                            |

One use-case per operation (never a generic service holding every method for a resource). See
[architecture.md](./architecture.md).

## DTOs

- **Request** (`create-x.dto.ts`, `update-x.dto.ts`, `x-query.dto.ts`): `@ApiProperty`/
  `@ApiPropertyOptional` from Swagger, and validators from `@shared/validators` whenever a wrapper
  exists for the validator in use (`IsString`, `IsEmail`, `IsEnum`, `IsUUID`, `IsArray`,
  `MinLength`, `MaxLength`, `Matches`, `Length`, `IsNotEmpty`, `IsUrl`, `IsCpf`): these are thin
  wrappers over the equivalent `class-validator` decorators, already pre-wired with a translated
  error message (`i18nValidationMessage('validation.<key>')`), so import from there, not directly
  from `class-validator`, to avoid hardcoding an English-only message. Decorators with no wrapper
  (e.g. `IsOptional`, which doesn't fail on its own; it just skips the rest of the validations
  when the field is `undefined`, so it has no error message of its own to translate) are imported
  directly from `class-validator`. When adding a new validator that doesn't have a wrapper yet and
  does produce an error message, add the wrapper to `shared/validators/i18n-validators.ts`
  following the same pattern, instead of importing directly from `class-validator` with a
  hardcoded message. Listing DTOs extend `PaginationQueryDTO`
  (`shared/dtos/pagination-query.dto.ts`) to inherit `page`/`perPage`.
- **Response** (`x-response.dto.ts`): a `static from(entity): XResponseDTO` that maps the entity:
  never serialize a TypeORM entity directly in an HTTP response. Exception: when building the DTO
  requires an injected, asynchronous dependency (e.g. `AuditLogResponseMapper`, which needs
  `AuditPipelineService` to translate/format the diff); in that case, an `@Injectable()` mapper
  with an async instance method replaces the synchronous `static from()`.

## Errors: `AppException`

Any business rule that fails throws `AppException.from(i18nKey, httpStatus, options?)`, never a
generic Nest `HttpException`/`BadRequestException` with a hardcoded string:

```ts
throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
throw AppException.from('users.errors.emailTaken', HttpStatus.CONFLICT, { args: { email } });
```

`i18nKey` gets resolved into the final message by the global `HttpExceptionFilter`
(`shared/filters/`), using the current request's locale: the use-case never calls
`i18n.translate(...)` to build an error response message (this is different from building an
e-mail body, where the use-case _does_ need to resolve the text before enqueuing, see
[mailing.md](./mailing.md)). `options.args` are the translated message's interpolation parameters;
`options.code` is an optional stable error code, so the frontend can distinguish scenarios without
parsing the translated message.

Every new error key goes into the owning module's locale file
(`core/i18n/locales/pt-BR/<module>.json`, inside the `errors` block), never hardcoded in English
or Portuguese inside the code.

## Pagination

Listings use offset-based pagination (`skip`/`take`), not cursor-based:

```ts
const [data, total] = await this.repo.findAndCount({
  where, skip: buildSkip(page, perPage), take: perPage, order: { ... },
});
return buildPaginatedResult(data, total, page, perPage);
```

`buildSkip`/`buildPaginatedResult` (`shared/utils/pagination.util.ts`) and `IPaginatedResult<T>`
(`{ data, meta: { total, page, perPage, lastPage } }`) are the only places that assemble this
shape; don't recompute `lastPage` manually anywhere else.

## Logging

Logging uses `@nestjs/common`'s built-in `Logger`, instantiated per class:

```ts
private readonly logger = new Logger(MyClass.name);
```

Don't use `console.log`/`console.error` in application code, and don't try to use `shared/logger/`
(that service exists in the codebase but isn't registered in any imported module; don't reference
it until someone actually wires it into DI).

## UUIDs

Every entity has an `id` (incrementing, `PrimaryGeneratedColumn`, internal/join use) and a `uuid`
(exposed externally: routes, DTOs, storage/Redis keys). Never expose the numeric `id` in a route
or response. New UUIDs are generated via `UuidService.generate()`
(`shared/services/uuid.service.ts`), which defaults to UUID v7 (sortable, better for database
indexes). Only request `v4` explicitly when there's a concrete reason not to want sortability.
