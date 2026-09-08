import { HttpStatus, Injectable } from '@nestjs/common';

import { StorageService } from '@core/storage/storage.service';

import { ROLE_REQUESTER } from '@shared/constants';
import { AppException } from '@shared/exceptions';
import { UuidService } from '@shared/services/uuid.service';

import { BuildingEntity } from '@modules/locations/entities/building.entity';
import { EnvironmentEntity } from '@modules/locations/entities/environment.entity';
import { LocationsRepository } from '@modules/locations/repositories/locations.repository';
import { SectorEntity } from '@modules/sectors/entities/sector.entity';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { CreateTicketDTO } from '../dtos/create-ticket.dto';
import { TicketResponseDTO } from '../dtos/ticket-response.dto';
import { TicketEventEntity } from '../entities/ticket-event.entity';
import { TicketPhotoEntity } from '../entities/ticket-photo.entity';
import { TicketEntity } from '../entities/ticket.entity';
import { ETicketEventType } from '../enums/ticket-event-type.enum';
import { ETicketStatus } from '../enums/ticket-status.enum';
import { TicketsRepository } from '../repositories/tickets.repository';

@Injectable()
export class CreateTicketUseCase {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly sectorsRepository: SectorsRepository,
    private readonly locationsRepository: LocationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly storageService: StorageService,
    private readonly uuidService: UuidService,
  ) {}

  async execute(
    currentUserUuid: string,
    dto: CreateTicketDTO,
    photos: Express.Multer.File[] = [],
  ): Promise<TicketResponseDTO> {
    const requester = await this.usersRepository.findByUuid(currentUserUuid);

    if (!requester) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    const requesterId = requester.id;
    const automaticSector = await this.requireSector(dto.automatic_sector_id);
    const confirmedSector = await this.requireSector(dto.confirmed_sector_id);
    const { building, environment } = await this.requireLocation(dto.location);

    const ticketUuid = this.uuidService.generate();
    const protocol = await this.ticketsRepository.nextProtocol();
    const storageKeys = await this.uploadPhotos(ticketUuid, photos);

    // RB-03/RB-04: `automaticSectorId`/`confirmedSectorId` are set once,
    // here, and never overwritten afterwards by anything in this codebase.
    const requesterCorrected = automaticSector.id !== confirmedSector.id;

    const ticketData: Partial<TicketEntity> = {
      uuid: ticketUuid,
      protocol,
      requesterId,
      description: dto.description,
      buildingId: building.id,
      environmentId: environment.id,
      automaticSectorId: automaticSector.id,
      confirmedSectorId: confirmedSector.id,
      currentSectorId: confirmedSector.id,
      resolvedBySectorId: null,
      requesterCorrected,
      sectorReclassified: false,
      // Created directly as FORWARDED, not OPEN: the confirmed sector is
      // already known by the time this request arrives, so there's no
      // intermediate moment where the ticket would actually sit unrouted.
      status: ETicketStatus.FORWARDED,
      internalNote: null,
      correctSectorReachedAt: null,
      resolvedAt: null,
    };

    const photosData: Array<Partial<TicketPhotoEntity>> = storageKeys.map((storageKey) => ({
      uuid: this.uuidService.generate(),
      storageKey,
    }));

    const events = this.buildInitialEvents(
      requesterId,
      automaticSector.id,
      confirmedSector.id,
      requesterCorrected,
    );

    const ticket = await this.ticketsRepository.createWithInitialEvents(
      ticketData,
      photosData,
      events,
    );

    return TicketResponseDTO.from(ticket, automaticSector, confirmedSector, confirmedSector);
  }

  private buildInitialEvents(
    requesterId: number,
    automaticSectorId: number,
    confirmedSectorId: number,
    requesterCorrected: boolean,
  ): Array<Partial<TicketEventEntity>> {
    return [
      {
        uuid: this.uuidService.generate(),
        type: ETicketEventType.TICKET_OPENED,
        actorUserId: requesterId,
        actorRole: ROLE_REQUESTER,
      },
      {
        uuid: this.uuidService.generate(),
        type: ETicketEventType.AUTO_CLASSIFIED,
        actorUserId: null,
        actorRole: null,
        toSectorId: automaticSectorId,
      },
      {
        uuid: this.uuidService.generate(),
        type: requesterCorrected
          ? ETicketEventType.REQUESTER_CHANGED_SECTOR
          : ETicketEventType.REQUESTER_CONFIRMED_SECTOR,
        actorUserId: requesterId,
        actorRole: ROLE_REQUESTER,
        fromSectorId: automaticSectorId,
        toSectorId: confirmedSectorId,
      },
    ];
  }

  private async uploadPhotos(ticketUuid: string, photos: Express.Multer.File[]): Promise<string[]> {
    return Promise.all(
      photos.map(async (photo, index) => {
        const key = `tickets/${ticketUuid}/${this.uuidService.generate()}-${index}`;
        await this.storageService.upload(key, photo.buffer, photo.mimetype);

        return key;
      }),
    );
  }

  private async requireSector(uuid: string): Promise<SectorEntity> {
    const sector = await this.sectorsRepository.findByUuid(uuid);

    if (!sector) {
      throw AppException.from('sectors.errors.notFound', HttpStatus.NOT_FOUND, { args: { uuid } });
    }

    return sector;
  }

  private async requireLocation(
    location: CreateTicketDTO['location'],
  ): Promise<{ building: BuildingEntity; environment: EnvironmentEntity }> {
    const building = await this.locationsRepository.findBuildingByUuid(location.building_id);

    if (!building) {
      throw AppException.from('locations.errors.buildingNotFound', HttpStatus.NOT_FOUND, {
        args: { uuid: location.building_id },
      });
    }

    const environment = await this.locationsRepository.findEnvironmentByUuid(
      location.environment_id,
    );

    if (!environment || environment.buildingId !== building.id) {
      throw AppException.from('locations.errors.environmentNotFound', HttpStatus.NOT_FOUND, {
        args: { uuid: location.environment_id },
      });
    }

    return { building, environment };
  }
}
