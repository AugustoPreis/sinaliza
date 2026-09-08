import { DataSource, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

import { ROLE_ADMIN, ROLE_REQUESTER, ROLE_SECTOR } from '@shared/constants';

import { PermissionEntity } from '@modules/roles/entities/permission.entity';
import { RoleEntity } from '@modules/roles/entities/role.entity';

// Sinaliza has 3 roles (endpoints-sinaliza.md §2/§19): REQUESTER, SECTOR and
// ADMIN. Only ADMIN is reserved/system-managed — it always gets every
// permission that exists at seed time (including ones added by future
// phases, since this seeder re-runs `permissions.find()` each time).
// REQUESTER and SECTOR are ordinary roles: an admin can edit their
// permissions later from the RBAC screens, this seeder just makes sure they
// exist.
const NON_RESERVED_ROLES = [
  { name: ROLE_REQUESTER, description: 'Solicitante: abre e acompanha os próprios chamados.' },
  { name: ROLE_SECTOR, description: 'Equipe de setor: atende a fila dos setores vinculados.' },
];

// Minimal default permission each ordinary role needs to use its own core
// flow out of the box (§19 matrix: "Classificar relato"/"Criar chamado" are
// REQUESTER-only). Granted once, additively — never removed here — so an
// admin's later changes from the RBAC screens aren't fought on every seed
// run.
//
// SECTOR's defaults, added in Phase 4: `tickets:read-sector` backs
// `GET /sector/tickets` (§10.1); `update-status`/`reassign`/`internal-note`
// back the three ticket mutations a sector performs from Tela B.3
// (§10.2-10.4). `sectors:read` is granted per this phase's spec even though
// the picker the reassign flow actually uses (`GET /sectors`, §6.1) is
// already unguarded for any authenticated user (see `SectorsController`) —
// this only additionally lets SECTOR read `GET /admin/sectors`' fuller view
// (categories + responsible users), which is harmless and matches what was
// asked for explicitly.
const DEFAULT_ROLE_PERMISSIONS: Record<string, Array<{ resource: string; action: string }>> = {
  [ROLE_REQUESTER]: [
    { resource: 'classification', action: 'preview' },
    { resource: 'tickets', action: 'create' },
  ],
  [ROLE_SECTOR]: [
    { resource: 'tickets', action: 'read-sector' },
    { resource: 'tickets', action: 'update-status' },
    { resource: 'tickets', action: 'reassign' },
    { resource: 'tickets', action: 'internal-note' },
    { resource: 'sectors', action: 'read' },
  ],
};

export class RolesSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const roleRepository = this.dataSource.getRepository(RoleEntity);
    const permissionRepository = this.dataSource.getRepository(PermissionEntity);

    await this.seedAdminRole(roleRepository, permissionRepository);

    for (const role of NON_RESERVED_ROLES) {
      const exists = await roleRepository.exists({ where: { name: role.name } });

      if (!exists) {
        await roleRepository.save(
          roleRepository.create({ uuid: uuidv7(), name: role.name, description: role.description }),
        );
      }
    }

    await this.seedDefaultRolePermissions(roleRepository, permissionRepository);

    console.log('RolesSeeder: completed');
  }

  private async seedDefaultRolePermissions(
    roleRepository: Repository<RoleEntity>,
    permissionRepository: Repository<PermissionEntity>,
  ): Promise<void> {
    for (const [roleName, defaults] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const role = await roleRepository.findOne({
        where: { name: roleName },
        relations: { permissions: true },
      });

      if (!role) continue;

      const missing = [];

      for (const { resource, action } of defaults) {
        const alreadyGranted = role.permissions.some(
          (permission) => permission.resource === resource && permission.action === action,
        );

        if (alreadyGranted) continue;

        const permission = await permissionRepository.findOneBy({ resource, action });

        if (permission) {
          missing.push(permission);
        }
      }

      if (missing.length) {
        role.permissions = [...role.permissions, ...missing];
        await roleRepository.save(role);
      }
    }
  }

  private async seedAdminRole(
    roleRepository: Repository<RoleEntity>,
    permissionRepository: Repository<PermissionEntity>,
  ): Promise<void> {
    let role = await roleRepository.findOne({
      where: { name: ROLE_ADMIN },
      relations: { permissions: true },
    });

    if (!role) {
      role = roleRepository.create({
        uuid: uuidv7(),
        name: ROLE_ADMIN,
        description: 'Administrador geral: acesso total ao portal (Tela C.1-C.5).',
      });

      role = await roleRepository.save(role);
    }

    const permissions = await permissionRepository.find();

    role.permissions = permissions;
    role.isReserved = true;

    await roleRepository.save(role);
  }
}
