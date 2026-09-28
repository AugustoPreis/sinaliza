import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/features/tickets/domain/ticket_filter.dart';
import 'package:mobile/src/features/tickets/presentation/cubit/my_tickets_cubit.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/mocks.dart';

void main() {
  late MockTicketsRepository repository;

  setUpAll(registerMockFallbacks);
  setUp(() => repository = MockTicketsRepository());

  final page1 = [for (var i = 1; i <= 20; i++) buildTicket(i)];
  final page2 = [for (var i = 21; i <= 25; i++) buildTicket(i)];

  void stubPage(int page, Object result) {
    final call = when(
      () => repository.getMyTickets(filter: TicketFilter.open, page: page),
    );
    if (result is AppFailure) {
      call.thenThrow(result);
    } else {
      call.thenAnswer((_) async => result as PagedResult<TicketListItem>);
    }
  }

  MyTicketsCubit build() =>
      MyTicketsCubit(repository: repository, filter: TicketFilter.open);

  MyTicketsState loaded(
    List<TicketListItem> items, {
    int total = 25,
    int page = 1,
  }) => MyTicketsState(
    status: MyTicketsStatus.success,
    items: List.unmodifiable(items),
    page: page,
    total: total,
    hasMore: page * 20 < total,
  );

  group('primeira página', () {
    blocTest<MyTicketsCubit, MyTicketsState>(
      'skeleton e depois a lista',
      setUp: () => stubPage(1, buildPage(page1, total: 25)),
      build: build,
      act: (cubit) => cubit.load(),
      expect: () => [
        const MyTicketsState(status: MyTicketsStatus.loading),
        loaded(page1),
      ],
    );

    blocTest<MyTicketsCubit, MyTicketsState>(
      'lista vazia',
      setUp: () => stubPage(1, buildPage(const [])),
      build: build,
      act: (cubit) => cubit.load(),
      skip: 1,
      verify: (cubit) {
        expect(cubit.state.isEmpty, isTrue);
        expect(cubit.state.hasMore, isFalse);
      },
    );

    blocTest<MyTicketsCubit, MyTicketsState>(
      'erro -> estado de falha',
      setUp: () => stubPage(1, const NetworkFailure()),
      build: build,
      act: (cubit) => cubit.load(),
      expect: () => [
        const MyTicketsState(status: MyTicketsStatus.loading),
        const MyTicketsState(
          status: MyTicketsStatus.failure,
          failure: NetworkFailure(),
        ),
      ],
    );

    blocTest<MyTicketsCubit, MyTicketsState>(
      'loadIfNeeded só carrega uma vez',
      setUp: () => stubPage(1, buildPage(page1, total: 25)),
      build: build,
      act: (cubit) async {
        await cubit.loadIfNeeded();
        await cubit.loadIfNeeded();
      },
      verify: (_) => verify(
        () => repository.getMyTickets(filter: TicketFilter.open, page: 1),
      ).called(1),
    );
  });

  group('rolagem infinita', () {
    blocTest<MyTicketsCubit, MyTicketsState>(
      'carrega a próxima página até o total',
      setUp: () => stubPage(2, buildPage(page2, page: 2, total: 25)),
      build: build,
      seed: () => loaded(page1),
      act: (cubit) async {
        await cubit.loadMore();
        await cubit.loadMore(); // já chegou ao total: não pede página 3
      },
      expect: () => [
        loaded(page1).copyWith(isLoadingMore: true),
        loaded([...page1, ...page2], page: 2),
      ],
      verify: (cubit) {
        expect(cubit.state.items, hasLength(25));
        verifyNever(
          () => repository.getMyTickets(filter: TicketFilter.open, page: 3),
        );
      },
    );

    blocTest<MyTicketsCubit, MyTicketsState>(
      'não duplica itens se as páginas se deslocarem',
      // Um chamado novo empurrou o ticket-20 para a página 2.
      setUp: () => stubPage(
        2,
        buildPage([buildTicket(20), ...page2], page: 2, total: 26),
      ),
      build: build,
      seed: () => loaded(page1, total: 26),
      act: (cubit) => cubit.loadMore(),
      verify: (cubit) {
        final ids = cubit.state.items.map((t) => t.id).toList();
        expect(ids.toSet(), hasLength(ids.length));
        expect(ids, hasLength(25));
      },
    );

    blocTest<MyTicketsCubit, MyTicketsState>(
      'erro na próxima página mantém a lista e permite tentar de novo',
      setUp: () => stubPage(2, const NetworkFailure()),
      build: build,
      seed: () => loaded(page1),
      act: (cubit) async {
        await cubit.loadMore();
        stubPage(2, buildPage(page2, page: 2, total: 25));
        await cubit.loadMore();
      },
      expect: () => [
        loaded(page1).copyWith(isLoadingMore: true),
        loaded(page1).copyWith(loadMoreFailure: () => const NetworkFailure()),
        loaded(page1).copyWith(isLoadingMore: true),
        loaded([...page1, ...page2], page: 2),
      ],
    );

    test('não dispara duas páginas ao mesmo tempo', () async {
      final gate = Completer<void>();
      when(
        () => repository.getMyTickets(filter: TicketFilter.open, page: 2),
      ).thenAnswer((_) async {
        await gate.future;
        return buildPage(page2, page: 2, total: 25);
      });
      final cubit = build()..emit(loaded(page1));

      final first = cubit.loadMore();
      await cubit.loadMore();
      gate.complete();
      await first;

      verify(
        () => repository.getMyTickets(filter: TicketFilter.open, page: 2),
      ).called(1);
      await cubit.close();
    });

    blocTest<MyTicketsCubit, MyTicketsState>(
      'página vazia encerra a rolagem mesmo com total maior',
      setUp: () => stubPage(2, buildPage(const [], page: 2, total: 25)),
      build: build,
      seed: () => loaded(page1),
      act: (cubit) => cubit.loadMore(),
      verify: (cubit) => expect(cubit.state.hasMore, isFalse),
    );
  });

  group('refresh', () {
    blocTest<MyTicketsCubit, MyTicketsState>(
      'mantém a lista visível e troca pela primeira página nova',
      setUp: () => stubPage(
        1,
        buildPage([buildTicket(0), ...page1.take(19)], total: 26),
      ),
      build: build,
      seed: () => loaded([...page1, ...page2], page: 2),
      act: (cubit) => cubit.refresh(),
      expect: () => [
        loaded([buildTicket(0), ...page1.take(19)], total: 26),
      ],
    );

    blocTest<MyTicketsCubit, MyTicketsState>(
      'falha no refresh não apaga a lista',
      setUp: () => stubPage(1, const ServerFailure()),
      build: build,
      seed: () => loaded(page1),
      act: (cubit) => cubit.refresh(),
      expect: () => [
        loaded(page1).copyWith(failure: () => const ServerFailure()),
      ],
    );

    blocTest<MyTicketsCubit, MyTicketsState>(
      'aba nunca aberta não carrega no refresh',
      build: build,
      act: (cubit) => cubit.refresh(),
      expect: () => <MyTicketsState>[],
      verify: (_) => verifyNever(
        () => repository.getMyTickets(
          filter: any(named: 'filter'),
          page: any(named: 'page'),
        ),
      ),
    );

    test('resposta de página antiga é descartada após refresh', () async {
      final gate = Completer<void>();
      when(
        () => repository.getMyTickets(filter: TicketFilter.open, page: 2),
      ).thenAnswer((_) async {
        await gate.future;
        return buildPage(page2, page: 2, total: 25);
      });
      stubPage(1, buildPage(page1.take(3).toList(), total: 3));
      final cubit = build()..emit(loaded(page1));

      final more = cubit.loadMore();
      await cubit.refresh();
      gate.complete();
      await more;

      expect(cubit.state.items, hasLength(3));
      await cubit.close();
    });
  });
}
