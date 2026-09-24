import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SharedModule } from '@shared/shared.module';

import { SectorUserEntity } from '@modules/users/entities/sector-user.entity';
import { UserEntity } from '@modules/users/entities/user.entity';

import { AdminSectorsController } from './controllers/admin-sectors.controller';
import { SectorsController } from './controllers/sectors.controller';
import { SectorEntity } from './entities/sector.entity';
import { SectorsRepository } from './repositories/sectors.repository';
import { CreateSectorUseCase } from './use-cases/create-sector.use-case';
import { ListAdminSectorsUseCase } from './use-cases/list-admin-sectors.use-case';
import { ListSectorsUseCase } from './use-cases/list-sectors.use-case';
import { UpdateSectorUseCase } from './use-cases/update-sector.use-case';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([SectorEntity, SectorUserEntity, UserEntity])],
  controllers: [SectorsController, AdminSectorsController],
  providers: [
    SectorsRepository,
    ListSectorsUseCase,
    ListAdminSectorsUseCase,
    CreateSectorUseCase,
    UpdateSectorUseCase,
  ],
  exports: [SectorsRepository],
})
export class SectorsModule {}
