import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

import { ROLE_SECTOR } from '@shared/constants';

import { BuildingEntity } from '@modules/locations/entities/building.entity';
import { EnvironmentEntity } from '@modules/locations/entities/environment.entity';
import { RoleEntity } from '@modules/roles/entities/role.entity';
import { SectorEntity } from '@modules/sectors/entities/sector.entity';
import { TicketEntity } from '@modules/tickets/entities/ticket.entity';
import { ETicketStatus } from '@modules/tickets/enums/ticket-status.enum';
import { SectorUserEntity } from '@modules/users/entities/sector-user.entity';
import { UserRoleEntity } from '@modules/users/entities/user-role.entity';
import { UserEntity } from '@modules/users/entities/user.entity';

import { AdminSeeder, PermissionsSeeder, RolesSeeder } from '../../../src/core/database/seeds';
import { ILoginAsResult, loginAs } from '../../support/auth.helper';
import { ITestContainers, startContainers, stopContainers } from '../../support/containers';
import { buildUser } from '../../support/entity-factories';
import { bootstrapTestApp } from '../../support/test-app.helper';
import { createTestDataSource } from '../../support/test-data-source';

const ADMIN_EMAIL = 'admin@ticket-filter-test.local';
const ADMIN_PASSWORD = 'AdminTest@123';
const SECTOR_AGENT_EMAIL = 'sector-agent@ticket-filter-test.local';

interface ITicketListItem {
  status: ETicketStatus;
}

interface ITicketListResponse {
  items: ITicketListItem[];
  total: number;
}

// Reproduces RB-09's queue-status filter over real HTTP (`GET
// /sector/tickets?status=...` and `GET /admin/tickets?status=...`), through
// the real Express query parser and Nest's `ValidationPipe`/query DTOs -
// the layer a mocked use-case spec can't exercise.
describe('Ticket status filter (integration)', () => {
  let containers: ITestContainers;
  let dataSource: DataSource;
  let app: INestApplication;
  let admin: ILoginAsResult;
  let sectorAgent: ILoginAsResult;

  beforeAll(async () => {
    containers = await startContainers();
    dataSource = await createTestDataSource(containers.postgres);

    process.env.ADMIN_EMAIL = ADMIN_EMAIL;
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;

    await new PermissionsSeeder(dataSource).run();
    await new RolesSeeder(dataSource).run();
    await new AdminSeeder(dataSource).run();

    app = await bootstrapTestApp({
      dbHost: containers.postgres.getHost(),
      dbPort: containers.postgres.getPort(),
      dbUsername: containers.postgres.getUsername(),
      dbPassword: containers.postgres.getPassword(),
      dbName: containers.postgres.getDatabase(),
      redisHost: containers.redis.getHost(),
      redisPort: containers.redis.getPort(),
    });

    admin = await loginAs(app, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    const buildingRepo = dataSource.getRepository(BuildingEntity);
    const environmentRepo = dataSource.getRepository(EnvironmentEntity);
    const sectorRepo = dataSource.getRepository(SectorEntity);
    const userRepo = dataSource.getRepository(UserEntity);

    const building = await buildingRepo.save(
      buildingRepo.create({ uuid: uuidv7(), name: 'Prédio de teste' }),
    );
    const environment = await environmentRepo.save(
      environmentRepo.create({ uuid: uuidv7(), name: 'Sala de teste', buildingId: building.id }),
    );
    const sector = await sectorRepo.save(
      sectorRepo.create({ uuid: uuidv7(), name: 'Setor de teste', categories: [] }),
    );

    const sectorAgentUser = buildUser({ email: SECTOR_AGENT_EMAIL });
    const savedAgent = await userRepo.save(sectorAgentUser);

    const roleRepo = dataSource.getRepository(RoleEntity);
    const sectorRole = await roleRepo.findOneByOrFail({ name: ROLE_SECTOR });

    await dataSource.getRepository(UserRoleEntity).save({
      userId: savedAgent.id,
      roleId: sectorRole.id,
    });
    await dataSource.getRepository(SectorUserEntity).save({
      userId: savedAgent.id,
      sectorId: sector.id,
    });

    sectorAgent = await loginAs(app, {
      email: SECTOR_AGENT_EMAIL,
      password: 'Password@123',
    });

    const requester = await userRepo.save(
      buildUser({ email: `requester-${Date.now()}@ticket-filter-test.local` }),
    );

    const ticketRepo = dataSource.getRepository(TicketEntity);
    const statuses = [
      ETicketStatus.OPEN,
      ETicketStatus.FORWARDED,
      ETicketStatus.IN_PROGRESS,
      ETicketStatus.RESOLVED,
      ETicketStatus.RESOLVED,
    ];

    for (const [index, status] of statuses.entries()) {
      await ticketRepo.save(
        ticketRepo.create({
          uuid: uuidv7(),
          protocol: `SIN-${Date.now()}-${index}`,
          requesterId: requester.id,
          description: 'Ticket de teste para filtro de status',
          buildingId: building.id,
          environmentId: environment.id,
          automaticSectorId: sector.id,
          confirmedSectorId: sector.id,
          currentSectorId: sector.id,
          resolvedBySectorId: status === ETicketStatus.RESOLVED ? sector.id : null,
          requesterCorrected: false,
          sectorReclassified: false,
          status,
          internalNote: null,
          correctSectorReachedAt: null,
          resolvedAt: status === ETicketStatus.RESOLVED ? new Date() : null,
        }),
      );
    }
  }, 60000);

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
    await stopContainers(containers);
  });

  // The frontend's Axios client serializes array query params as repeated
  // bracketed keys (`status[]=A&status[]=B`), not bare repeated keys or
  // indexed brackets - build the querystring by hand so this test actually
  // exercises that wire format instead of whatever a test-client helper
  // happens to prefer.
  function bracketArrayQuery(param: string, values: string[]): string {
    return values.map((value) => `${param}[]=${encodeURIComponent(value)}`).join('&');
  }

  it('GET /sector/tickets?status[]=RESOLVED only returns RESOLVED tickets', async () => {
    const response = await sectorAgent.agent
      .get(`/api/v1/sector/tickets?${bracketArrayQuery('status', [ETicketStatus.RESOLVED])}`)
      .expect(200);

    const body = response.body.data as ITicketListResponse;

    expect(body.total).toBe(2);
    expect(body.items).toHaveLength(2);
    expect(body.items.every((item) => item.status === ETicketStatus.RESOLVED)).toBe(true);
  });

  it('GET /sector/tickets with no status filter defaults to the active queue (FORWARDED/IN_PROGRESS), excluding RESOLVED and OPEN', async () => {
    const response = await sectorAgent.agent.get('/api/v1/sector/tickets').expect(200);

    const body = response.body.data as ITicketListResponse;

    expect(body.total).toBe(2);
    expect(
      body.items.every(
        (item) =>
          item.status === ETicketStatus.FORWARDED || item.status === ETicketStatus.IN_PROGRESS,
      ),
    ).toBe(true);
  });

  it('GET /admin/tickets?status[]=RESOLVED only returns RESOLVED tickets', async () => {
    const response = await admin.agent
      .get(`/api/v1/admin/tickets?${bracketArrayQuery('status', [ETicketStatus.RESOLVED])}`)
      .expect(200);

    const body = response.body.data as ITicketListResponse;

    expect(body.total).toBe(2);
    expect(body.items).toHaveLength(2);
    expect(body.items.every((item) => item.status === ETicketStatus.RESOLVED)).toBe(true);
  });

  it('GET /admin/tickets?status[]=OPEN&status[]=FORWARDED restricts to the requested statuses', async () => {
    const response = await admin.agent
      .get(
        `/api/v1/admin/tickets?${bracketArrayQuery('status', [ETicketStatus.OPEN, ETicketStatus.FORWARDED])}`,
      )
      .expect(200);

    const body = response.body.data as ITicketListResponse;

    expect(body.total).toBe(2);
    expect(
      body.items.every(
        (item) => item.status === ETicketStatus.OPEN || item.status === ETicketStatus.FORWARDED,
      ),
    ).toBe(true);
  });
});
