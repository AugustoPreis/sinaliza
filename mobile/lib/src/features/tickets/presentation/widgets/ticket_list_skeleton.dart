import 'package:flutter/material.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';

/// Placeholder da lista enquanto a primeira página carrega.
class TicketListSkeleton extends StatelessWidget {
  const TicketListSkeleton({this.count = 5, super.key});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: AppStrings.loading,
      liveRegion: true,
      child: ExcludeSemantics(
        child: ListView.separated(
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.lg,
            AppSpacing.lg,
            AppSpacing.xxl,
          ),
          itemCount: count,
          separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
          itemBuilder: (_, _) => const _SkeletonCard(),
        ),
      ),
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  const _SkeletonCard();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _Bar(width: 90, height: 16),
                Spacer(),
                _Bar(width: 80, height: 22, radius: AppRadius.pill),
              ],
            ),
            SizedBox(height: AppSpacing.md),
            _Bar(height: 12),
            SizedBox(height: AppSpacing.sm),
            _Bar(width: 200, height: 12),
            SizedBox(height: AppSpacing.md),
            _Bar(width: 140, height: 10),
          ],
        ),
      ),
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({required this.height, this.width, this.radius = AppSpacing.xs});

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: context.colors.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}
