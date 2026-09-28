import { ApiProperty } from '@nestjs/swagger';

export class UnreadNotificationsCountResponseDTO {
  @ApiProperty({ description: 'Notificações do solicitante ainda não lidas' })
  count!: number;

  static from(count: number): UnreadNotificationsCountResponseDTO {
    const dto = new UnreadNotificationsCountResponseDTO();

    dto.count = count;

    return dto;
  }
}
