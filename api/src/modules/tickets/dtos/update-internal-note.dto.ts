import { ApiProperty } from '@nestjs/swagger';

import { IsString, MaxLength } from '@shared/validators';

// `PATCH /tickets/{ticketId}/internal-note` request body (endpoints-sinaliza.md
// §10.4). Empty string is allowed on purpose — it's how a sector clears a
// previously written note.
export class UpdateInternalNoteDTO {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  internal_note!: string;
}
