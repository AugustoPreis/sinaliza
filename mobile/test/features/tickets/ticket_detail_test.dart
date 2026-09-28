import 'dart:async';
import 'dart:typed_data';

import 'package:bloc_test/bloc_test.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/router/router.dart';
import 'package:mobile/src/core/styles/app_theme.dart';
import 'package:mobile/src/features/tickets/data/datasources/tickets_remote_datasource.dart';
import 'package:mobile/src/features/tickets/data/repositories/tickets_repository_impl.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/features/tickets/domain/ticket_changed_signal.dart';
import 'package:mobile/src/features/tickets/presentation/cubit/ticket_detail_cubit.dart';
import 'package:mobile/src/features/tickets/presentation/pages/ticket_detail_page.dart';
import 'package:mobile/src/features/tickets/presentation/widgets/ticket_photos.dart';
import 'package:mobile/src/shared/data/models/ticket_models.dart';
import 'package:mocktail/mocktail.dart';
import 'package:photo_view/photo_view_gallery.dart';

import '../../core/network/fake_api.dart';
import '../../fixtures/fixture_reader.dart';
import '../../helpers/mocks.dart';

/// PNG 1x1 transparente (substitui as fotos de rede nos testes).
final _pixel = Uint8List.fromList(const [
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, //
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
  0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
]);

void main() {
  setUpAll(() async {
    registerMockFallbacks();
    await initializeDateFormatting('pt_BR');
    ticketPhotoProvider = (_) => MemoryImage(_pixel);
  });

  group('repositório', () {
    late FakeSinalizaApi api;
    late SessionEventBus events;
    late TicketsRepositoryImpl repository;

    setUp(() {
      api = FakeSinalizaApi();
      events = SessionEventBus();
      repository = TicketsRepositoryImpl(
        TicketsRemoteDataSource(
          ApiClient(
            baseUrl: baseUrl,
            cookieJar: CookieJar(),
            sessionEvents: events,
            httpClientAdapter: api,
            enableLogging: false,
          ),
        ),
      );
    });

    tearDown(() => events.dispose());

    test('GET /tickets/{id}', () async {
      api.routes['GET /tickets/abc-123'] = (_) =>
          FakeReply.ok(fixture('api/ticket_detail'));

      final ticket = await repository.getTicket('abc-123');

      expect(api.requests.single.uri.path, '/api/v1/tickets/abc-123');
      expect(ticket.protocol, 'SIN-1042');
    });

    test('404 e 403 viram as falhas correspondentes', () async {
      api.routes['GET /tickets/x'] = (_) => FakeReply.error(404, 'Não achou.');
      await expectLater(
        repository.getTicket('x'),
        throwsA(isA<NotFoundFailure>()),
      );
      api.routes['GET /tickets/y'] = (_) => FakeReply.error(403, 'Proibido.');
      await expectLater(
        repository.getTicket('y'),
        throwsA(isA<ForbiddenFailure>()),
      );
    });
  });

  group('cubit', () {
    late MockTicketsRepository repository;
    final ticket = fixtureTicketDetail();

    setUp(() => repository = MockTicketsRepository());

    TicketDetailCubit build() =>
        TicketDetailCubit(repository: repository, ticketId: ticket.id);

    blocTest<TicketDetailCubit, TicketDetailState>(
      'carrega o detalhe',
      setUp: () => when(
        () => repository.getTicket(any()),
      ).thenAnswer((_) async => ticket),
      build: build,
      act: (cubit) => cubit.load(),
      expect: () => [TicketDetailLoaded(ticket)],
    );

    for (final failure in const <AppFailure>[
      NotFoundFailure(),
      ForbiddenFailure(),
    ]) {
      blocTest<TicketDetailCubit, TicketDetailState>(
        '${failure.runtimeType} -> não encontrado',
        setUp: () => when(() => repository.getTicket(any())).thenThrow(failure),
        build: build,
        act: (cubit) => cubit.load(),
        expect: () => [const TicketDetailNotFound()],
      );
    }

    blocTest<TicketDetailCubit, TicketDetailState>(
      'erro de rede -> falha com retry',
      setUp: () => when(
        () => repository.getTicket(any()),
      ).thenThrow(const NetworkFailure()),
      build: build,
      act: (cubit) => cubit.load(),
      expect: () => [const TicketDetailFailure(NetworkFailure())],
    );

    blocTest<TicketDetailCubit, TicketDetailState>(
      'refresh com erro mantém o conteúdo',
      setUp: () => when(
        () => repository.getTicket(any()),
      ).thenThrow(const ServerFailure()),
      build: build,
      seed: () => TicketDetailLoaded(ticket),
      act: (cubit) => cubit.refresh(),
      expect: () => [
        TicketDetailLoaded(ticket, refreshFailure: const ServerFailure()),
      ],
    );
  });

  group('tela', () {
    late MockTicketsRepository repository;

    setUp(() => repository = MockTicketsRepository());

    Future<void> openDetail(WidgetTester tester, {String id = 't-1'}) async {
      tester.view
        ..physicalSize = const Size(800, 2400)
        ..devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        RepositoryProvider<TicketsRepository>.value(
          value: repository,
          child: MaterialApp(
            theme: appTheme,
            onGenerateRoute: AppRouter.generateRoute,
            home: Builder(
              builder: (context) => Scaffold(
                body: TextButton(
                  onPressed: () => Navigator.of(
                    context,
                  ).pushNamed(AppRouterEnum.ticketDetail.route, arguments: id),
                  child: const Text('lista'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('lista'));
      await tester.pumpAndSettle();
    }

    testWidgets('mostra cabeçalho, setor atual, dados e linha do tempo', (
      tester,
    ) async {
      stubTicketDetail(repository);
      await openDetail(tester, id: 'd4c3b2a1');

      verify(() => repository.getTicket('d4c3b2a1')).called(1);
      expect(find.text('#SIN-1042'), findsOneWidget);
      expect(find.text(AppStrings.statusInProgress), findsOneWidget);
      // Setor atual é o mais recente (reencaminhado para TI).
      expect(find.text(AppStrings.detailCurrentSector), findsOneWidget);
      expect(find.text('TI'), findsOneWidget);
      expect(find.text('O projetor da sala 101 não liga.'), findsOneWidget);
      expect(find.text('Bloco A · Sala 101'), findsOneWidget);
      expect(find.text('${AppStrings.detailPhotos} (1)'), findsOneWidget);
      expect(
        find.text('Redirecionado para TI: equipamento de projeção.'),
        findsOneWidget,
      );
    });

    testWidgets('linha do tempo do mais recente para o mais antigo', (
      tester,
    ) async {
      stubTicketDetail(repository);
      await openDetail(tester);

      final newest = tester.getTopLeft(
        find.text('Chamado alterado para Em andamento.'),
      );
      final reassigned = tester.getTopLeft(
        find.text('Redirecionado para TI: equipamento de projeção.'),
      );
      final opened = tester.getTopLeft(find.text('Chamado aberto.'));
      expect(newest.dy, lessThan(reassigned.dy));
      expect(reassigned.dy, lessThan(opened.dy));
    });

    testWidgets('não exibe internal_note nem a divergência de setores', (
      tester,
    ) async {
      final json = fixture('api/ticket_detail')
        ..['internal_note'] = 'Nota interna secreta';
      when(
        () => repository.getTicket(any()),
      ).thenAnswer((_) async => TicketDetailModel.fromJson(json));
      await openDetail(tester);

      expect(find.textContaining('Nota interna'), findsNothing);
      expect(find.textContaining('sugerido'), findsNothing);
    });

    testWidgets('foto abre em tela cheia com zoom e deslize', (tester) async {
      stubTicketDetail(repository);
      await openDetail(tester);

      await tester.tap(
        find.bySemanticsLabel(AppStrings.detailPhotoSemantics(1, 1)),
      );
      // O visualizador anima o carregamento: sem pumpAndSettle.
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      expect(find.byType(TicketPhotoViewer), findsOneWidget);
      expect(find.byType(PhotoViewGallery), findsOneWidget);
      expect(
        find.text(AppStrings.detailPhotoViewerTitle(1, 1)),
        findsOneWidget,
      );
    });

    testWidgets('404/403 mostra "Chamado não encontrado" com voltar', (
      tester,
    ) async {
      when(
        () => repository.getTicket(any()),
      ).thenThrow(const ForbiddenFailure());
      await openDetail(tester);

      expect(find.textContaining(AppStrings.detailNotFound), findsOneWidget);
      await tester.tap(find.text(AppStrings.back));
      await tester.pumpAndSettle();
      expect(find.text('lista'), findsOneWidget);
    });

    testWidgets('erro com "Tentar novamente"', (tester) async {
      when(() => repository.getTicket(any())).thenThrow(const NetworkFailure());
      await openDetail(tester);
      expect(find.text(AppStrings.errorNetwork), findsOneWidget);

      stubTicketDetail(repository);
      await tester.tap(find.text(AppStrings.retry));
      await tester.pumpAndSettle();
      expect(find.text('#SIN-1042'), findsOneWidget);
    });

    testWidgets('push com o app aberto recarrega só o chamado certo', (
      tester,
    ) async {
      final signal = TicketChangedSignal();
      addTearDown(signal.dispose);
      stubTicketDetail(repository);
      tester.view
        ..physicalSize = const Size(800, 2400)
        ..devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        MultiRepositoryProvider(
          providers: [
            RepositoryProvider<TicketsRepository>.value(value: repository),
            RepositoryProvider<TicketChangedSignal>.value(value: signal),
          ],
          child: MaterialApp(
            theme: appTheme,
            home: const TicketDetailPage(ticketId: 't-1'),
          ),
        ),
      );
      await tester.pumpAndSettle();
      verify(() => repository.getTicket('t-1')).called(1);

      await tester.runAsync(() async {
        signal
          ..notify('outro')
          ..notify('t-1');
        await Future<void>.delayed(Duration.zero);
      });
      await tester.pumpAndSettle();

      verify(() => repository.getTicket('t-1')).called(1);
      verifyNever(() => repository.getTicket('outro'));
    });

    testWidgets('pull-to-refresh busca de novo (novo status aparece)', (
      tester,
    ) async {
      stubTicketDetail(repository);
      await openDetail(tester);

      final resolved = fixture('api/ticket_detail')
        ..['status'] = 'RESOLVED'
        ..['timeline'] = [
          ...(fixture('api/ticket_detail')['timeline'] as List),
          {
            'type': 'TICKET_RESOLVED',
            'description': 'Chamado resolvido.',
            'created_at': '2026-08-21T10:00:00.000Z',
          },
        ];
      when(
        () => repository.getTicket(any()),
      ).thenAnswer((_) async => TicketDetailModel.fromJson(resolved));

      // Mesmo efeito de puxar a lista para baixo. Não aguarda o `show()`:
      // ele só termina com os frames rodando (pumpAndSettle).
      unawaited(
        tester
            .state<RefreshIndicatorState>(find.byType(RefreshIndicator))
            .show(),
      );
      await tester.pumpAndSettle();

      expect(find.text(AppStrings.statusResolved), findsOneWidget);
      expect(find.text('Chamado resolvido.'), findsOneWidget);
    });
  });
}
