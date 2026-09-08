import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

import { DEFAULT_PAGE_SIZE } from '@shared/constants';

import { IPaginatedResult, IPaginationMeta } from '../interfaces';

export class PaginationMetaDTO implements IPaginationMeta {
  @ApiProperty()
  total: number = 0;

  @ApiProperty()
  page: number = 1;

  @ApiProperty()
  perPage: number = DEFAULT_PAGE_SIZE;

  @ApiProperty()
  lastPage: number = 1;
}

export class PaginatedResponseDTO<T> implements IPaginatedResult<T> {
  // T is erased at runtime, so this can't carry its own type metadata —
  // ApiPaginatedResponse overrides `data` per-endpoint via an `allOf`
  // schema fragment instead. Left undecorated, Nest's schema factory
  // trips over introspecting this generic array property on its own.
  @ApiHideProperty()
  data: T[] = [];

  @ApiProperty({ type: PaginationMetaDTO })
  meta: PaginationMetaDTO = new PaginationMetaDTO();
}
