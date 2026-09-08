import { HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import { validate as isUuid } from 'uuid';

import { AppException } from '@shared/exceptions';

@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUuid(value)) {
      throw AppException.from('errors.invalidUuid', HttpStatus.BAD_REQUEST, { args: { value } });
    }

    return value;
  }
}
