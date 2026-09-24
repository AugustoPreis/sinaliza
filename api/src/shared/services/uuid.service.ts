import { Injectable } from '@nestjs/common';
import { v4, v7 } from 'uuid';

@Injectable()
export class UuidService {
  generate(version: 'v4' | 'v7' = 'v7'): string {
    switch (version) {
      case 'v4':
        return v4();
      case 'v7':
      default:
        // Version 7 is used in database entities for better performance and sorting capabilities
        // For this reason, it is the default version when generating UUIDs in the application
        return v7();
    }
  }
}
