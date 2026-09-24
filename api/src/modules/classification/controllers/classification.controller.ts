import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '@shared/decorators';

import { ClassificationResponseDTO } from '../dtos/classification-response.dto';
import { PreviewClassificationDTO } from '../dtos/preview-classification.dto';
import { PreviewClassificationUseCase } from '../use-cases/preview-classification.use-case';

@ApiTags('Classification')
@ApiBearerAuth()
@Controller({ path: 'classification', version: '1' })
export class ClassificationController {
  constructor(private readonly previewClassificationUseCase: PreviewClassificationUseCase) {}

  @Post('preview')
  @RequirePermission('classification', 'preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview the automatic sector for a description (does not create a ticket)',
  })
  preview(@Body() dto: PreviewClassificationDTO): Promise<ClassificationResponseDTO> {
    return this.previewClassificationUseCase.execute(dto);
  }
}
