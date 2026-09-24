import { MigrationInterface, QueryRunner } from 'typeorm';

// `buildings` 1-N `environments`, backing the guided prédio → ambiente
// picker (Tela A.3) and `GET /locations` (endpoints-sinaliza.md §5). No
// admin screen manages this cadastro in this version - see
// `LocationsSeeder` for the dev-only sample data that fills it.
export class Locations1752600000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id BIGSERIAL PRIMARY KEY,
        uuid UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_buildings_uuid ON buildings(uuid)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS environments (
        id BIGSERIAL PRIMARY KEY,
        uuid UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        building_id BIGINT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_environments_uuid ON environments(uuid)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_environments_building_id ON environments(building_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS environments`);
    await queryRunner.query(`DROP TABLE IF EXISTS buildings`);
  }
}
