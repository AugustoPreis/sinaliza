import 'package:mobile/src/core/utils/json.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';

/// `{ items: [...], page, page_size, total }`.
abstract final class PagedResultModel {
  static PagedResult<T> fromJson<T>(
    Json json,
    T Function(Json json) parseItem,
  ) {
    final items = json.list('items', parseItem);
    return PagedResult<T>(
      items: items,
      page: json['page'] is num ? json.integer('page') : 1,
      pageSize: json['page_size'] is num
          ? json.integer('page_size')
          : items.length,
      total: json['total'] is num ? json.integer('total') : items.length,
    );
  }
}
