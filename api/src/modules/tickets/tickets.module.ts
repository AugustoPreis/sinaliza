import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StorageModule } from '@core/storage/storage.module';

import { SharedModule } from '@shared/shared.module';

import { LocationsModule } from '@modules/locations/locations.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { SectorsModule } from '@modules/sectors/sectors.module';
import { UsersModule } from '@modules/users/users.module';

import { AdminTicketsController } from './controllers/admin-tickets.controller';
import { SectorTicketsController } from './controllers/sector-tickets.controller';
import { TicketsController } from './controllers/tickets.controller';
import { TicketEventEntity } from './entities/ticket-event.entity';
import { TicketPhotoEntity } from './entities/ticket-photo.entity';
import { TicketEntity } from './entities/ticket.entity';
import { TicketsRepository } from './repositories/tickets.repository';
import { CreateTicketUseCase } from './use-cases/create-ticket.use-case';
import { GetAdminDashboardUseCase } from './use-cases/get-admin-dashboard.use-case';
import { GetTicketUseCase } from './use-cases/get-ticket.use-case';
import { ListAdminTicketsUseCase } from './use-cases/list-admin-tickets.use-case';
import { ListMyTicketsUseCase } from './use-cases/list-my-tickets.use-case';
import { ListSectorTicketsUseCase } from './use-cases/list-sector-tickets.use-case';
import { ReassignTicketUseCase } from './use-cases/reassign-ticket.use-case';
import { UpdateInternalNoteUseCase } from './use-cases/update-internal-note.use-case';
import { UpdateTicketStatusUseCase } from './use-cases/update-ticket-status.use-case';

@Module({
  imports: [
    SharedModule,
    StorageModule,
    SectorsModule,
    LocationsModule,
    UsersModule,
    // Status/reassign flows call `NotificationsRepository.create()` directly
    // (RB-14) — see `NotificationsModule`'s own header comment.
    NotificationsModule,
    TypeOrmModule.forFeature([TicketEntity, TicketPhotoEntity, TicketEventEntity]),
  ],
  controllers: [TicketsController, SectorTicketsController, AdminTicketsController],
  providers: [
    TicketsRepository,
    CreateTicketUseCase,
    ListMyTicketsUseCase,
    GetTicketUseCase,
    ListSectorTicketsUseCase,
    UpdateTicketStatusUseCase,
    ReassignTicketUseCase,
    UpdateInternalNoteUseCase,
    ListAdminTicketsUseCase,
    GetAdminDashboardUseCase,
  ],
  exports: [TicketsRepository],
})
export class TicketsModule {}
