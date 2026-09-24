import { Global, Module } from '@nestjs/common';

import { RequestContextService } from './context/request-context.service';
import { HashService } from './services/hash.service';
import { UuidService } from './services/uuid.service';

@Global()
@Module({
  providers: [HashService, UuidService, RequestContextService],
  exports: [HashService, UuidService, RequestContextService],
})
export class SharedModule {}
