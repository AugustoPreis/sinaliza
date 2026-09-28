import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { CreateTicketDTO } from '../create-ticket.dto';

// Same options as main.ts: `whitelist` used to strip every field of the
// JSON-encoded `location`, which then reached the use case as `{}` (500).
const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const BUILDING = '01a0e45b-43f1-760d-8726-90dda3516511';
const ENVIRONMENT = '01a0e45b-43f6-7581-8026-7836bf093c67';
const SECTOR = '10000000-0000-4000-8000-000000000005';

const validate = (location: string): Promise<CreateTicketDTO> =>
  pipe.transform(
    {
      description: 'Lâmpada queimada',
      location,
      automatic_sector_id: SECTOR,
      confirmed_sector_id: SECTOR,
    },
    { type: 'body', metatype: CreateTicketDTO },
  ) as Promise<CreateTicketDTO>;

describe('CreateTicketDTO', () => {
  it('parses the multipart `location` JSON string and keeps its fields', async () => {
    const dto = await validate(
      JSON.stringify({ building_id: BUILDING, environment_id: ENVIRONMENT, extra: 'x' }),
    );

    expect(dto.location).toEqual({ building_id: BUILDING, environment_id: ENVIRONMENT });
  });

  it('rejects a `location` with invalid ids', async () => {
    await expect(validate(JSON.stringify({ building_id: 'x' }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a `location` that is not JSON with a 400', async () => {
    await expect(validate('not json')).rejects.toBeInstanceOf(BadRequestException);
  });
});
