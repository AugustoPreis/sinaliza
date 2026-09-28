import 'dart:async';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mobile/src/features/notifications/domain/notifications_refresh_signal.dart';
import 'package:mobile/src/features/push/application/push_coordinator.dart';
import 'package:mobile/src/features/push/data/device_token_repository.dart';
import 'package:mobile/src/features/push/data/push_preferences.dart';
import 'package:mobile/src/features/push/domain/push_messaging.dart';
import 'package:mobile/src/features/push/domain/push_payload.dart';
import 'package:mobile/src/features/tickets/domain/ticket_changed_signal.dart';
import 'package:mobile/src/shared/domain/enums/notification_type.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/fake_api.dart';
import '../../helpers/test_data.dart';
import '../auth/session_cubit_test.dart' show MockAuthRepository;

class MockDeviceTokenRepository extends Mock implements DeviceTokenRepository {}

class FakePushMessaging implements PushMessaging {
  FakePushMessaging({this.available = true});

  final bool available;
  bool permissionGranted = true;
  String? token = 'fcm-token-1';
  int permissionRequests = 0;
  PushPayload? initialMessage;

  final foreground = StreamController<PushPayload>.broadcast();
  final opened = StreamController<PushPayload>.broadcast();
  final tokenRefresh = StreamController<String>.broadcast();

  @override
  bool get isAvailable => available;

  @override
  PushPlatform? get platform => PushPlatform.android;

  @override
  Future<bool> requestPermission() async {
    permissionRequests++;
    return permissionGranted;
  }

  @override
  Future<String?> getToken() async => token;

  @override
  Stream<String> get onTokenRefresh => tokenRefresh.stream;

  @override
  Stream<PushPayload> get onForegroundMessage => foreground.stream;

  @override
  Stream<PushPayload> get onMessageOpenedApp => opened.stream;

  @override
  Future<PushPayload?> getInitialMessage() async => initialMessage;
}

class FakeLocalNotifier implements LocalNotifier {
  final shown = <PushPayload>[];
  void Function(String ticketId)? onTap;

  @override
  Future<void> initialize({
    required void Function(String ticketId) onTap,
  }) async => this.onTap = onTap;

  @override
  Future<void> show(PushPayload payload) async => shown.add(payload);
}

const resolvedPush = PushPayload(
  ticketId: 't-42',
  protocol: 'SIN-1042',
  type: NotificationType.ticketResolved,
  title: 'Chamado #SIN-1042',
  body: 'Seu chamado SIN-1042 foi resolvido.',
);

void main() {
  setUpAll(() => registerFallbackValue(PushPlatform.android));

  group('PushPayload', () {
    test('lê o data do contrato', () {
      final payload = PushPayload.fromData(
        {'ticket_id': 't-1', 'protocol': 'SIN-1', 'type': 'TICKET_REASSIGNED'},
        title: 'Chamado #SIN-1',
        body: 'Redirecionado.',
      );
      expect(payload?.ticketId, 't-1');
      expect(payload?.type, NotificationType.ticketReassigned);
      expect(payload?.title, 'Chamado #SIN-1');
    });

    test('sem ticket_id não há o que abrir; tipo novo vira unknown', () {
      expect(PushPayload.fromData({'protocol': 'SIN-1'}), isNull);
      expect(
        PushPayload.fromData({'ticket_id': 't', 'type': 'NOVO'})?.type,
        NotificationType.unknown,
      );
    });
  });

  group('DeviceTokenRepository', () {
    test('POST e DELETE com os campos da API', () async {
      final api = FakeSinalizaApi()
        ..routes['POST /devices/push-token'] = ((_) =>
            FakeReply.ok({'success': true}))
        ..routes['DELETE /devices/push-token'] = ((_) =>
            FakeReply.ok({'success': true}));
      final events = SessionEventBus();
      addTearDown(events.dispose);
      final repository = DeviceTokenRepository(
        ApiClient(
          baseUrl: baseUrl,
          cookieJar: CookieJar(),
          sessionEvents: events,
          httpClientAdapter: api,
          enableLogging: false,
        ),
      );

      await repository.register('tok', PushPlatform.ios);
      await repository.remove('tok');

      expect(api.requests[0].data, {'token': 'tok', 'platform': 'IOS'});
      expect(api.requests[1].method, 'DELETE');
      expect(api.requests[1].data, {'token': 'tok'});
    });
  });

  group('PushCoordinator', () {
    late FakePushMessaging messaging;
    late FakeLocalNotifier notifier;
    late MockDeviceTokenRepository tokens;
    late PushPreferences preferences;
    late NotificationsRefreshSignal notificationsSignal;
    late TicketChangedSignal ticketSignal;
    late StreamController<SessionState> session;
    late List<String> opened;
    late int rationaleShown;
    late bool rationaleAnswer;
    late PushCoordinator coordinator;

    Future<void> build({bool available = true}) async {
      SharedPreferences.setMockInitialValues({});
      messaging = FakePushMessaging(available: available);
      notifier = FakeLocalNotifier();
      tokens = MockDeviceTokenRepository();
      when(() => tokens.register(any(), any())).thenAnswer((_) async {});
      when(() => tokens.remove(any())).thenAnswer((_) async {});
      preferences = PushPreferences(await SharedPreferences.getInstance());
      notificationsSignal = NotificationsRefreshSignal();
      ticketSignal = TicketChangedSignal();
      session = StreamController<SessionState>.broadcast();
      opened = [];
      rationaleShown = 0;
      rationaleAnswer = true;
      coordinator = PushCoordinator(
        messaging: messaging,
        localNotifier: notifier,
        tokens: tokens,
        preferences: preferences,
        notificationsSignal: notificationsSignal,
        ticketSignal: ticketSignal,
        openTicket: (id) async => opened.add(id),
        confirmPermissionRationale: () async {
          rationaleShown++;
          return rationaleAnswer;
        },
      );
    }

    Future<void> start([SessionState current = const SessionUnknown()]) =>
        coordinator.start(
          sessionChanges: session.stream,
          currentSession: current,
        );

    Future<void> emit(SessionState state) async {
      session.add(state);
      await pumpEventQueue();
    }

    tearDown(() async {
      await coordinator.dispose();
      await session.close();
    });

    test('após o login explica, pede permissão e registra o token', () async {
      await build();
      await start();
      await emit(SessionAuthenticated(requester));

      expect(rationaleShown, 1);
      expect(messaging.permissionRequests, 1);
      verify(
        () => tokens.register('fcm-token-1', PushPlatform.android),
      ).called(1);
      expect(preferences.choice, PushPermissionChoice.accepted);
    });

    test('sessão restaurada no início também registra', () async {
      await build();
      await start(SessionAuthenticated(requester));
      verify(
        () => tokens.register('fcm-token-1', PushPlatform.android),
      ).called(1);
    });

    test(
      'recusar a explicação: não pede ao sistema e não insiste depois',
      () async {
        await build();
        rationaleAnswer = false;
        await start();
        await emit(SessionAuthenticated(requester));

        expect(messaging.permissionRequests, 0);
        verifyNever(() => tokens.register(any(), any()));

        await emit(const SessionUnauthenticated());
        await emit(SessionAuthenticated(requester));
        expect(rationaleShown, 1);
        verifyNever(() => tokens.register(any(), any()));
      },
    );

    test('já aceito antes: não mostra a explicação de novo', () async {
      await build();
      await preferences.setChoice(PushPermissionChoice.accepted);
      await start();
      await emit(SessionAuthenticated(requester));

      expect(rationaleShown, 0);
      verify(() => tokens.register(any(), any())).called(1);
    });

    test('permissão negada no sistema: não registra', () async {
      await build();
      messaging.permissionGranted = false;
      await start();
      await emit(SessionAuthenticated(requester));
      verifyNever(() => tokens.register(any(), any()));
    });

    test(
      'falha no registro não quebra nada e tenta no próximo login',
      () async {
        await build();
        when(
          () => tokens.register(any(), any()),
        ).thenThrow(const NetworkFailure());
        await start();
        await emit(SessionAuthenticated(requester));

        when(() => tokens.register(any(), any())).thenAnswer((_) async {});
        await emit(const SessionUnauthenticated());
        await emit(SessionAuthenticated(requester));
        verify(() => tokens.register(any(), any())).called(2);
      },
    );

    test('token renovado é registrado de novo (só com sessão)', () async {
      await build();
      await preferences.setChoice(PushPermissionChoice.accepted);
      await start();

      messaging.tokenRefresh.add('antes-do-login');
      await pumpEventQueue();
      verifyNever(() => tokens.register('antes-do-login', any()));

      await emit(SessionAuthenticated(requester));
      messaging.tokenRefresh.add('fcm-token-2');
      await pumpEventQueue();
      verify(
        () => tokens.register('fcm-token-2', PushPlatform.android),
      ).called(1);
    });

    test('beforeLogout remove o token e ignora falhas', () async {
      await build();
      await start();
      await emit(SessionAuthenticated(requester));

      await coordinator.beforeLogout();
      verify(() => tokens.remove('fcm-token-1')).called(1);

      when(() => tokens.remove(any())).thenThrow(const NetworkFailure());
      await expectLater(coordinator.beforeLogout(), completes);
    });

    test(
      'push com o app aberto: notificação local e recarrega A.7/A.6',
      () async {
        await build();
        await start();
        final notificationsReload = expectLater(
          notificationsSignal.stream,
          emits(null),
        );
        final ticketReload = expectLater(ticketSignal.stream, emits('t-42'));

        messaging.foreground.add(resolvedPush);
        await pumpEventQueue();

        expect(notifier.shown, [resolvedPush]);
        await notificationsReload;
        await ticketReload;
      },
    );

    test('toque com sessão abre o chamado', () async {
      await build();
      await start(SessionAuthenticated(requester));

      messaging.opened.add(resolvedPush);
      await pumpEventQueue();
      notifier.onTap!('t-7'); // toque na notificação local

      expect(opened, ['t-42', 't-7']);
    });

    test('toque sem sessão guarda o destino e abre após o login', () async {
      await build();
      await start(const SessionUnauthenticated());

      messaging.opened.add(resolvedPush);
      await pumpEventQueue();
      expect(opened, isEmpty);
      expect(coordinator.pendingTicketId, 't-42');

      await emit(SessionAuthenticated(requester));
      expect(opened, ['t-42']);
      expect(coordinator.pendingTicketId, isNull);
    });

    test(
      'push que abriu o app fechado é aberto após restaurar a sessão',
      () async {
        await build();
        messaging.initialMessage = resolvedPush;
        await start();
        expect(opened, isEmpty);

        await emit(SessionAuthenticated(requester));
        expect(opened, ['t-42']);
      },
    );

    test('sem Firebase: nada acontece e o logout segue', () async {
      await build(available: false);
      await start(SessionAuthenticated(requester));
      await coordinator.beforeLogout();

      expect(rationaleShown, 0);
      verifyNever(() => tokens.register(any(), any()));
      verifyNever(() => tokens.remove(any()));
    });
  });

  test('SessionCubit remove o token antes do /auth/logout', () async {
    final repository = MockAuthRepository();
    final events = SessionEventBus();
    final calls = <String>[];
    when(
      () => repository.logout(),
    ).thenAnswer((_) async => calls.add('logout'));
    final cubit = SessionCubit(
      repository: repository,
      sessionEvents: events,
      beforeLogout: () async => calls.add('push-token'),
    );
    await cubit.loggedIn(requester);

    await cubit.logout();

    expect(calls, ['push-token', 'logout']);
    await cubit.close();
    await events.dispose();
  });
}
