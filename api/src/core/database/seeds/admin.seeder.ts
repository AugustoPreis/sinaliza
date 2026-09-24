import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

import { ROLE_ADMIN } from '@shared/constants';

import { RoleEntity } from '@modules/roles/entities/role.entity';
import { UserRoleEntity } from '@modules/users/entities/user-role.entity';
import { UserEntity } from '@modules/users/entities/user.entity';
import { EInstitutionalLink } from '@modules/users/enums/institutional-link.enum';
import { EUserStatus } from '@modules/users/enums/user-status.enum';

const DEFAULT_ADMIN_EMAIL = 'admin@sinaliza.local';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';
const BCRYPT_ROUNDS = 12;

export class AdminSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const userRepository = this.dataSource.getRepository(UserEntity);
    const roleRepository = this.dataSource.getRepository(RoleEntity);
    const userRoleRepository = this.dataSource.getRepository(UserRoleEntity);

    const adminEmail = process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;

    const existing = await userRepository.findOne({
      where: { email: adminEmail },
    });

    if (existing) {
      console.log('AdminSeeder: admin user already exists, skipping');
      return;
    }

    const adminRole = await roleRepository.findOneBy({
      name: ROLE_ADMIN,
    });

    const passwordHash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
      BCRYPT_ROUNDS,
    );

    const user = userRepository.create({
      uuid: uuidv7(),
      email: adminEmail,
      passwordHash,
      name: 'Administrador',
      institutionalLink: EInstitutionalLink.SERVIDOR,
      status: EUserStatus.ACTIVE,
    });

    await userRepository.save(user);

    if (adminRole) {
      const userRole = userRoleRepository.create({
        role: adminRole,
        user,
      });

      await userRoleRepository.save(userRole);
    }

    console.log(`AdminSeeder: admin user created (${adminEmail})`);
  }
}
