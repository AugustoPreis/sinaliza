import 'package:flutter/material.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/pagination/paged_list_cubit.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/widgets/app_button.dart';
import 'package:mobile/src/core/widgets/empty_view.dart';

/// Distância do fim da lista em que a próxima página começa a carregar.
const double pagedListLoadMoreThreshold = 400;

/// `true` quando a rolagem chegou perto do fim (use num
/// `NotificationListener<ScrollNotification>`).
bool isNearListEnd(ScrollNotification notification) =>
    notification.metrics.extentAfter < pagedListLoadMoreThreshold;

/// O rodapé deve aparecer (carregando ou erro da próxima página)?
bool showPagedListFooter(PagedListState<Object?> state) =>
    state.hasMore || state.isLoadingMore || state.loadMoreFailure != null;

/// Rodapé da lista paginada: carregando a próxima página ou erro com retry.
class PagedListFooter extends StatelessWidget {
  const PagedListFooter({
    required this.state,
    required this.failureMessage,
    required this.onRetry,
    super.key,
  });

  final PagedListState<Object?> state;
  final String failureMessage;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    if (state.loadMoreFailure != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        child: Column(
          children: [
            Text(
              failureMessage,
              textAlign: TextAlign.center,
              style: context.textStyles.bodyMedium?.copyWith(
                color: context.colors.onSurfaceVariant,
              ),
            ),
            AppButton.text(
              label: AppStrings.retry,
              icon: Icons.refresh,
              onPressed: onRetry,
            ),
          ],
        ),
      );
    }
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
      child: Center(
        child: SizedBox.square(
          dimension: 24,
          child: CircularProgressIndicator(strokeWidth: 2.5),
        ),
      ),
    );
  }
}

/// Estado vazio rolável, para o pull-to-refresh continuar funcionando.
class ScrollableEmptyView extends StatelessWidget {
  const ScrollableEmptyView({
    required this.message,
    required this.icon,
    super.key,
  });

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: constraints.maxHeight,
            child: EmptyView(icon: icon, message: message),
          ),
        ],
      ),
    );
  }
}
