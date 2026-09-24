# Creating a new module

Step-by-step for adding a new domain resource (e.g. a `products` module), mirroring the structure
already used by `users`/`roles`/`audit`.

## Folder structure

```
modules/products/
  controllers/products.controller.ts
  dtos/
    create-product.dto.ts
    update-product.dto.ts
    product-query.dto.ts
    product-response.dto.ts
  entities/product.entity.ts
  enums/product-status.enum.ts        # if there's a domain enum
  repositories/products.repository.ts
  use-cases/
    create-product.use-case.ts
    update-product.use-case.ts
    delete-product.use-case.ts
    find-product.use-case.ts
    list-products.use-case.ts
  utils/                                # pure helpers specific to this module, if needed
  products.module.ts
  products.constants.ts                 # module constants (e.g. limits), if needed
```

One use-case per operation, never a generic "ProductsService" with every method: this keeps each
operation independently testable and keeps the diff for a single business-rule change small.

## `products.module.ts`

```ts
@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([ProductEntity])],
  controllers: [ProductsController],
  providers: [
    ProductsRepository,
    ListProductsUseCase,
    FindProductUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
  ],
  exports: [ProductsRepository], // only the repository, if another module needs to read this data
})
export class ProductsModule {}
```

`SharedModule` is imported explicitly by convention even though it's `@Global()`: it makes it
clear, just from reading the module, that it depends on pieces of `shared/` (guards, exceptions,
etc.), even though it's not technically required for injection to work.

## Registering in `AppModule`

Add the import and the entry to `imports: [...]` in `src/app.module.ts`, alongside the
other domain modules (`UsersModule`, `RolesModule`, `AuthModule`, `AuditModule`).

## Entity

Extend `shared/entities/base.entity.ts` (`BaseEntity`): it already provides `id` (incrementing,
internal use), `uuid` (public), `createdAt`/`updatedAt`/`deletedAt`. If the entity should show up
in the audit trail, decorate it with `@AuditEntity({ name: '...', module: '...' })` and every
relevant field with `@Audit()`. See [auditing.md](./auditing.md). Generate the matching migration
(see `core/database/migrations/`, timestamp-based naming convention).

## Repository

One method per data-access operation, always returning the entity (never the DTO: mapping to a
DTO happens in the use-case or in the response DTO's `static from()`). For writes, always
`repo.save()`/`repo.remove()`/`repo.softRemove()`, never `repo.update()`/`repo.delete()`. See the
explanation in [architecture.md](./architecture.md#layers). For paginated listing, follow the
`buildSkip`/`buildPaginatedResult` pattern from `shared/utils/pagination.util.ts`.

## Controller

Thin: injects the module's use-cases, one method per route, delegates directly (`return
this.xUseCase.execute(...)`). Apply `@RequirePermission('<resource>', '<action>')` on every route
that requires granular authorization; only omit it for the few "action on the currently
authenticated user themselves" cases (e.g. `PUT /users/me/password`), and in that case, add a
one-line comment explaining why, following the pattern already used in `UsersController`.

## Naming

See [conventions.md](./conventions.md) for file/class naming, DTOs, and i18n error message
conventions.

## Tests

For each new use-case, add (or reuse) the `__tests__/` folder next to it. For the new repository,
add a `*.repository.integration-spec.ts` under `test/integration/<module>/`. See
[testing.md](./testing.md) for the full picture (why repositories/controllers follow different
rules, where each level lives, and the shared `test/support/` harness).
