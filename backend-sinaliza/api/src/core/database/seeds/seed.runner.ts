import { AppDataSource } from '../data-source';

import { AdminSeeder } from './admin.seeder';
import { LocationsSeeder } from './locations.seeder';
import { PermissionsSeeder } from './permissions.seeder';
import { RolesSeeder } from './roles.seeder';

async function runSeeds(): Promise<void> {
  console.log('Initializing database connection...');

  await AppDataSource.initialize();

  console.log('Running seeds...');

  await new PermissionsSeeder(AppDataSource).run();
  await new RolesSeeder(AppDataSource).run();
  await new AdminSeeder(AppDataSource).run();
  await new LocationsSeeder(AppDataSource).run();

  console.log('All seeds completed successfully.');

  await AppDataSource.destroy();
}

runSeeds().catch((error: unknown) => {
  console.error('Seed runner failed:', error);
  process.exit(1);
});
