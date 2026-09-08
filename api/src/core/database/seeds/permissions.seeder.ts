import { DataSource } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

import { PermissionEntity } from '@modules/roles/entities/permission.entity';

// Permissions for the Sinaliza matrix (endpoints-sinaliza.md §19), in
// `resource:action` shape. This seeder owns `users`/`sectors`/`classification`
// (Phase 1/2), `tickets`/`devices`/`notifications` (Phase 3, this one) and
// the platform's own `roles`/`permissions`/`audit` resources (kept from the
// original boilerplate, needed for the RBAC admin screens themselves).
//
// `research:read`/`research:export` (Phase 5, `modules/research`): back
// `GET /admin/research/indicators` and `GET /admin/research/export`
// respectively (§15). Deliberately separate from `tickets:read-all` — see
// `AdminTicketsController`'s header comment for why that one covers the
// operational `/admin/tickets`+`/admin/dashboard` pair instead.
//
// Ticket permission granularity, decided in Phase 3: `tickets:create` backs
// `POST /tickets` (`GET /tickets` and `GET /tickets/{id}` are self-service/
// row-based, see `TicketsController`, so neither needs a
// `@RequirePermission`). `read-sector`/`update-status`/`reassign`/
// `internal-note` were reserved in Phase 3 and are wired up in Phase 4:
// `read-sector` backs `GET /sector/tickets` (§10.1); `update-status`/
// `reassign`/`internal-note` back §10.2-10.4. `read-all` backs BOTH
// `GET /admin/tickets` (§11.1) and `GET /admin/dashboard` (§11.2) — see
// `AdminTicketsController`'s header comment for why one permission covers
// both. All five are granted to SECTOR (except `read-all`, admin-only) by
// `RolesSeeder`'s `DEFAULT_ROLE_PERMISSIONS`; ADMIN gets every permission
// automatically regardless (see `RolesSeeder.seedAdminRole`).
// `devices:manage`/`notifications:read` are defined but, per
// endpoints-sinaliza.md §4/§9, deliberately left ungated by
// `@RequirePermission` (self-service, same idiom as `users:update` password
// change) — kept here only so the names exist for anything that wants to
// grant/check them later.
const RESOURCE_ACTIONS: Record<string, string[]> = {
  users: ['create', 'read', 'update', 'delete', 'import', 'manage-permissions', 'revoke'],
  roles: ['create', 'read', 'update', 'delete'],
  permissions: ['create', 'read', 'update', 'delete'],
  audit: ['read'],
  // §12 (Tela C.2): sectors:read backs `GET /admin/sectors`, sectors:manage
  // backs the create/update endpoints. The public `GET /sectors` lookup
  // (§6.1) is intentionally unguarded (any authenticated user), see
  // `SectorsController`.
  sectors: ['read', 'manage'],
  // §7.1 (Tela A.4 preflight): classification:preview backs
  // `POST /classification/preview`, granted to REQUESTER below.
  classification: ['preview'],
  // §8 (chamados). See the comment block above for what's enforced now vs.
  // reserved for Phase 4.
  tickets: ['create', 'read-own', 'read-sector', 'read-all', 'update-status', 'reassign', 'internal-note'],
  devices: ['manage'],
  notifications: ['read'],
  // §15 (Tela C.5): research:read backs `GET /admin/research/indicators`,
  // research:export backs `GET /admin/research/export`. Admin-only (§19
  // matrix) — no default role grants these to REQUESTER/SECTOR.
  research: ['read', 'export'],
};

export class PermissionsSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const repository = this.dataSource.getRepository(PermissionEntity);

    for (const [resource, actions] of Object.entries(RESOURCE_ACTIONS)) {
      for (const action of actions) {
        const exists = await repository.exists({
          where: { resource, action },
        });

        if (!exists) {
          await repository.save({
            uuid: uuidv7(),
            resource,
            action,
          });
        }
      }
    }

    console.log('PermissionsSeeder: completed');
  }
}
