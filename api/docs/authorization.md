# Authorization (RBAC)

## Model

- **`PermissionEntity`**: a `resource:action` pair (e.g. `users:read`), with uniqueness enforced
  by a composite unique index `(resource, action)` at the database level. Resources and actions
  today follow a fixed cartesian product, seeded by `PermissionsSeeder`: resources `users`,
  `roles`, `permissions`, `audit`; actions `create`, `read`, `update`, `delete`.
- **`RoleEntity`**: a name, an optional description, and a `ManyToMany` relation to
  `PermissionEntity` (`role_permissions`). The `isReserved` field marks system-managed roles
  (today, only `admin`, created by `RolesSeeder` with every existing permission); never editable
  through a DTO, and `DeleteRoleUseCase` refuses to delete a reserved role.
- **`UserRoleEntity`**: the `user ↔ role` join table. A user can have multiple roles.

## Effective permissions

`getEffectivePermissions(userRoles)` (`modules/users/utils/effective-permissions.util.ts`)
flattens all of a user's roles into a deduplicated `Set<string>` of `resource:action` keys:

```ts
export function getEffectivePermissions(userRoles: UserRoleEntity[]): string[] {
  const keys = new Set<string>();
  for (const userRole of userRoles) {
    for (const permission of userRole.role.permissions) {
      keys.add(`${permission.resource}:${permission.action}`);
    }
  }
  return [...keys];
}
```

This is the central function: anywhere that needs to know "what can this user do" (the guard, and
the `GET /auth/me` endpoint) goes through the same input and produces the same list.

## Protecting an endpoint

```ts
@Get()
@RequirePermission('users', 'read')
findAll(@Query() query: UserQueryDTO) { ... }
```

`@RequirePermission(resource, action)` only writes metadata (`SetMetadata`). `PermissionsGuard`,
registered globally in `AppModule` (after `JwtAuthGuard`, before `CsrfGuard`), is what interprets
it. If the handler/controller has **no** `@RequirePermission`, the guard doesn't block anything
(`if (!required) return true`), but the endpoint still requires authentication because
`JwtAuthGuard` runs earlier in the chain. Only skip it for actions on the currently authenticated
user themselves (e.g. `PUT /users/me/password`, `POST /users/me/avatar`), always with a one-line
comment explaining why; never by oversight.

The guard **never trusts anything cached in the JWT**: on every protected request, it fetches the
`UserEntity` (with `userRoles`, eager-loaded) again from the database and recomputes effective
permissions. This is deliberate: a role/permission change now takes effect on the very next
request, with no need to invalidate tokens.

## Public endpoint

For an endpoint that requires no authentication at all (doesn't even go through `JwtAuthGuard`),
use `@Public()` (`shared/decorators/public.decorator.ts`); that, not the absence of
`@RequirePermission`, is what removes the token requirement. The only current use: `GET /health`.

## Managing roles and permissions

`RolesModule` exposes full CRUD for `roles` and `permissions`, plus two special endpoints:

- `PUT /v1/roles/:uuid/permissions` (`UpdateRolePermissionsUseCase`): **replaces** a role's
  permission set wholesale (not incremental; send the full desired list).
- `POST /v1/roles/:uuid/clone` (`CloneRoleUseCase`): creates a new role by copying the source
  role's permissions by reference; takes the same creation DTO (new `name`/`description`
  required).

As with any other module, `RolesRepository`/`PermissionsRepository` write via
`save()`/`remove()`, never `update()`/`delete()`: required for the audit trail to capture the
"before" state (see [auditing.md](./auditing.md)).
