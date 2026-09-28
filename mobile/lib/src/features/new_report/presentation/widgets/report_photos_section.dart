import 'dart:io';

import 'package:flutter/material.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/shared/domain/entities/report_photo.dart';
import 'package:mobile/src/features/new_report/presentation/cubit/new_report_state.dart';

/// Fotos do relato: miniaturas com "remover" e botões de câmera/galeria.
class ReportPhotosSection extends StatelessWidget {
  const ReportPhotosSection({
    required this.photos,
    required this.isProcessing,
    required this.enabled,
    required this.onAdd,
    required this.onRemove,
    super.key,
  });

  final List<ReportPhoto> photos;
  final bool isProcessing;
  final bool enabled;
  final ValueChanged<PhotoSource> onAdd;
  final ValueChanged<ReportPhoto> onRemove;

  @override
  Widget build(BuildContext context) {
    final canAdd =
        enabled && !isProcessing && photos.length < NewReportState.maxPhotos;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                AppStrings.reportPhotosTitle,
                style: context.textStyles.titleMedium,
              ),
            ),
            Text(
              AppStrings.reportPhotosCount(
                photos.length,
                NewReportState.maxPhotos,
              ),
              style: context.textStyles.bodySmall?.copyWith(
                color: context.colors.onSurfaceVariant,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          AppStrings.reportPhotosHelper,
          style: context.textStyles.bodySmall?.copyWith(
            color: context.colors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        if (photos.isNotEmpty || isProcessing) ...[
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              for (final (index, photo) in photos.indexed)
                _Thumbnail(
                  photo: photo,
                  index: index + 1,
                  onRemove: enabled ? () => onRemove(photo) : null,
                ),
              if (isProcessing) const _ProcessingTile(),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
        ],
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: canAdd ? () => onAdd(PhotoSource.camera) : null,
                icon: const Icon(Icons.photo_camera_outlined),
                label: const Text(AppStrings.reportAddFromCamera),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: canAdd ? () => onAdd(PhotoSource.gallery) : null,
                icon: const Icon(Icons.photo_library_outlined),
                label: const Text(AppStrings.reportAddFromGallery),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _Thumbnail extends StatelessWidget {
  const _Thumbnail({required this.photo, required this.index, this.onRemove});

  static const double size = 88;

  final ReportPhoto photo;
  final int index;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: AppStrings.reportPhotoSemantics(index),
      image: true,
      child: SizedBox.square(
        dimension: size,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.control),
              child: Image.file(
                File(photo.path),
                fit: BoxFit.cover,
                cacheWidth: 256,
                errorBuilder: (context, _, _) => ColoredBox(
                  color: context.colors.surfaceContainerHighest,
                  child: const Icon(Icons.broken_image_outlined),
                ),
              ),
            ),
            if (onRemove != null)
              Positioned(
                top: 2,
                right: 2,
                child: Material(
                  color: context.colors.surface.withValues(alpha: 0.9),
                  shape: const CircleBorder(),
                  child: IconButton(
                    tooltip: AppStrings.reportRemovePhoto,
                    visualDensity: VisualDensity.compact,
                    iconSize: 18,
                    icon: const Icon(Icons.close),
                    onPressed: onRemove,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ProcessingTile extends StatelessWidget {
  const _ProcessingTile();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: AppStrings.reportPhotoProcessing,
      child: Container(
        width: _Thumbnail.size,
        height: _Thumbnail.size,
        decoration: BoxDecoration(
          color: context.colors.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppRadius.control),
        ),
        alignment: Alignment.center,
        child: const SizedBox.square(
          dimension: 24,
          child: CircularProgressIndicator(strokeWidth: 2.5),
        ),
      ),
    );
  }
}
