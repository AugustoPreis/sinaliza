import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';

enum PagedListStatus { initial, loading, success, failure }

/// Estado de uma lista paginada com rolagem infinita.
class PagedListState<T> extends Equatable {
  const PagedListState({
    this.status = PagedListStatus.initial,
    this.items = const [],
    this.page = 0,
    this.total = 0,
    this.hasMore = false,
    this.isLoadingMore = false,
    this.loadMoreFailure,
    this.failure,
  });

  final PagedListStatus status;
  final List<T> items;

  /// Última página carregada (0 = nenhuma).
  final int page;
  final int total;
  final bool hasMore;
  final bool isLoadingMore;

  /// Erro ao buscar a próxima página: a lista continua visível, com retry
  /// no rodapé.
  final AppFailure? loadMoreFailure;

  /// Erro da primeira página (tela inteira com "Tentar novamente") ou, com
  /// itens na tela, de um refresh (aviso pontual).
  final AppFailure? failure;

  bool get isEmpty => status == PagedListStatus.success && items.isEmpty;

  PagedListState<T> copyWith({
    PagedListStatus? status,
    List<T>? items,
    int? page,
    int? total,
    bool? hasMore,
    bool? isLoadingMore,
    AppFailure? Function()? loadMoreFailure,
    AppFailure? Function()? failure,
  }) {
    return PagedListState<T>(
      status: status ?? this.status,
      items: items ?? this.items,
      page: page ?? this.page,
      total: total ?? this.total,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      loadMoreFailure: loadMoreFailure != null
          ? loadMoreFailure()
          : this.loadMoreFailure,
      failure: failure != null ? failure() : this.failure,
    );
  }

  @override
  List<Object?> get props => [
    status,
    items,
    page,
    total,
    hasMore,
    isLoadingMore,
    loadMoreFailure,
    failure,
  ];
}

/// Lista paginada (A.2, A.7): primeira página com skeleton, rolagem
/// infinita, refresh que mantém a lista e descarte de respostas antigas.
abstract class PagedListCubit<T> extends Cubit<PagedListState<T>> {
  PagedListCubit() : super(PagedListState<T>());

  /// Busca a página [page] (começa em 1). Lança só `AppFailure`.
  Future<PagedResult<T>> fetchPage(int page);

  /// Identidade do item, para não duplicar entre páginas.
  String idOf(T item);

  /// Incrementado a cada recarga, para descartar respostas de páginas
  /// pedidas antes dela.
  int _generation = 0;

  /// Carrega a primeira vez (só se ainda não carregou).
  Future<void> loadIfNeeded() async {
    if (state.status == PagedListStatus.initial) await load();
  }

  /// Primeira página, com skeleton se ainda não há itens.
  Future<void> load() async {
    emit(
      state.items.isEmpty
          ? PagedListState<T>(status: PagedListStatus.loading)
          : state.copyWith(failure: () => null),
    );
    await _fetchFirstPage();
  }

  /// Pull-to-refresh / volta de outra tela: mantém a lista visível enquanto
  /// recarrega a primeira página. Lista nunca aberta não carrega (carrega
  /// ao ser aberta).
  Future<void> refresh() async {
    switch (state.status) {
      case PagedListStatus.initial:
        return;
      case PagedListStatus.failure:
        return load();
      case PagedListStatus.loading || PagedListStatus.success:
        await _fetchFirstPage();
    }
  }

  Future<void> _fetchFirstPage() async {
    final generation = ++_generation;
    try {
      final result = await fetchPage(1);
      if (isClosed || generation != _generation) return;
      emit(
        PagedListState<T>(
          status: PagedListStatus.success,
          items: _dedupe(result.items),
          page: result.page,
          total: result.total,
          hasMore: result.hasMore && result.items.isNotEmpty,
        ),
      );
    } on AppFailure catch (failure) {
      if (isClosed || generation != _generation) return;
      // Com itens na tela, falha de refresh não apaga a lista.
      emit(
        state.items.isEmpty
            ? PagedListState<T>(
                status: PagedListStatus.failure,
                failure: failure,
              )
            : state.copyWith(
                status: PagedListStatus.success,
                failure: () => failure,
              ),
      );
    }
  }

  /// Próxima página (rolagem infinita). Também serve de "Tentar novamente"
  /// do rodapé.
  Future<void> loadMore() async {
    if (state.status != PagedListStatus.success ||
        !state.hasMore ||
        state.isLoadingMore) {
      return;
    }

    final generation = _generation;
    emit(state.copyWith(isLoadingMore: true, loadMoreFailure: () => null));
    try {
      final result = await fetchPage(state.page + 1);
      if (isClosed || generation != _generation) return;
      emit(
        state.copyWith(
          items: _dedupe([...state.items, ...result.items]),
          page: result.page,
          total: result.total,
          // Página vazia encerra mesmo se o total mudou no meio do caminho.
          hasMore: result.hasMore && result.items.isNotEmpty,
          isLoadingMore: false,
        ),
      );
    } on AppFailure catch (failure) {
      if (isClosed || generation != _generation) return;
      emit(
        state.copyWith(isLoadingMore: false, loadMoreFailure: () => failure),
      );
    }
  }

  /// A paginação da API é por offset: um item criado durante a rolagem
  /// desloca as páginas e repetiria itens. Mantém a primeira ocorrência.
  List<T> _dedupe(List<T> items) {
    final seen = <String>{};
    return List.unmodifiable(items.where((item) => seen.add(idOf(item))));
  }
}
