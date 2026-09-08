import { DataSource } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

import { BuildingEntity } from '@modules/locations/entities/building.entity';
import { EnvironmentEntity } from '@modules/locations/entities/environment.entity';

// Dev-only sample data. `endpoints-sinaliza.md` §21 point 2 explicitly leaves
// the origin of the buildings/environments cadastro as an open technical
// decision — there is no admin screen to manage it in this version (see
// `LocationsModule`'s comment). This seeder exists purely so a local/dev
// environment has something to pick from on Tela A.3; a real deployment
// would need this data provided by the institution through some other means
// (fixed config, its own system, an import) decided later.
const SAMPLE_CAMPUS: Array<{ name: string; environments: string[] }> = [
  { name: 'Bloco A', environments: ['Sala 101', 'Sala 102', 'Corredor térreo'] },
  { name: 'Bloco B', environments: ['Laboratório de Informática', 'Sala de Professores'] },
  { name: 'Bloco C', environments: ['Auditório', 'Biblioteca'] },
];

export class LocationsSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const buildingRepository = this.dataSource.getRepository(BuildingEntity);
    const environmentRepository = this.dataSource.getRepository(EnvironmentEntity);

    for (const building of SAMPLE_CAMPUS) {
      let entity = await buildingRepository.findOne({ where: { name: building.name } });

      if (!entity) {
        entity = await buildingRepository.save(
          buildingRepository.create({ uuid: uuidv7(), name: building.name }),
        );
      }

      for (const environmentName of building.environments) {
        const exists = await environmentRepository.exists({
          where: { name: environmentName, buildingId: entity.id },
        });

        if (!exists) {
          await environmentRepository.save(
            environmentRepository.create({ uuid: uuidv7(), name: environmentName, buildingId: entity.id }),
          );
        }
      }
    }

    console.log('LocationsSeeder: completed');
  }
}
