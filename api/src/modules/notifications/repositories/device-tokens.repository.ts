import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UuidService } from '@shared/services/uuid.service';

import { DeviceTokenEntity } from '../entities/device-token.entity';
import { EDevicePlatform } from '../enums/device-platform.enum';

// TODO(push-dispatch): this repository only persists the token — there is
// no FCM/APNs (or any other push provider) integration yet. Wiring one up
// is a future extension point: whatever calls `NotificationsRepository.create()`
// would, at that point, also look up the user's tokens here and dispatch an
// actual push. Endpoints-sinaliza.md §21 point 5 leaves the push provider an
// open technical decision.
@Injectable()
export class DeviceTokensRepository {
  constructor(
    @InjectRepository(DeviceTokenEntity)
    private readonly repo: Repository<DeviceTokenEntity>,
    private readonly uuidService: UuidService,
  ) {}

  async upsert(userId: number, token: string, platform: EDevicePlatform): Promise<DeviceTokenEntity> {
    const existing = await this.repo.findOne({ where: { userId, token } });

    if (existing) {
      existing.platform = platform;

      return this.repo.save(existing);
    }

    return this.repo.save(this.repo.create({ uuid: this.uuidService.generate(), userId, token, platform }));
  }

  async remove(userId: number, token: string): Promise<void> {
    await this.repo.delete({ userId, token });
  }
}
