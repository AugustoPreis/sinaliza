import 'package:equatable/equatable.dart';

/// Página de uma lista (`GET /tickets`, `GET /notifications`).
///
/// A query usa `page`/`perPage`, mas a resposta usa `page`/`page_size`.
class PagedResult<T> extends Equatable {
  const PagedResult({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.total,
  });

  const PagedResult.empty({this.pageSize = 20})
    : items = const [],
      page = 1,
      total = 0;

  final List<T> items;

  /// Começa em 1.
  final int page;
  final int pageSize;
  final int total;

  bool get hasMore => page * pageSize < total;

  bool get isEmpty => items.isEmpty;

  @override
  List<Object?> get props => [items, page, pageSize, total];
}
