import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UuidService } from '@shared/services/uuid.service';

import { DeviceTokenEntity } from '../entities/device-token.entity';
import { EDevicePlatform } from '../enums/device-platform.enum';

// TODO(push-dispatch): this repository only persists the token — no
// FCM/APNs integration yet. Wiring one up means looking up the user's
// tokens here wherever `NotificationsRepository.create()` is called, and
// dispatching an actual push.
@Injectable()
export class DeviceTokensRepository {
  constructor(
    @InjectRepository(DeviceTokenEntity)
    private readonly repo: Repository<DeviceTokenEntity>,
    private readonly uuidService: UuidService,
  ) {}

  async upsert(
    userId: number,
    token: string,
    platform: EDevicePlatform,
  ): Promise<DeviceTokenEntity> {
    const existing = await this.repo.findOne({ where: { userId, token } });

    if (existing) {
      existing.platform = platform;

      return this.repo.save(existing);
    }

    return this.repo.save(
      this.repo.create({ uuid: this.uuidService.generate(), userId, token, platform }),
    );
  }

  async remove(userId: number, token: string): Promise<void> {
    await this.repo.delete({ userId, token });
  }
}
