import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDTO<T> {
  @ApiProperty({ example: true })
  success: boolean = true;

  data: T = null as T;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string = new Date().toISOString();
}
