import 'dart:async';

import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:mobile/src/features/notifications/domain/notifications_refresh_signal.dart';
import 'package:mobile/src/features/push/data/device_token_repository.dart';
import 'package:mobile/src/features/push/data/push_preferences.dart';
import 'package:mobile/src/features/push/domain/push_messaging.dart';
import 'package:mobile/src/features/push/domain/push_payload.dart';
import 'package:mobile/src/features/tickets/domain/ticket_changed_signal.dart';

/// Orquestra o push do solicitante:
///
/// - depois do login (ou da sessão restaurada), explica e pede a permissão
///   uma vez, pega o token e registra na API (`POST /devices/push-token`);
/// - token renovado é registrado de novo;
/// - antes do logout remove o token (`DELETE`), ignorando falhas;
/// - push com o app aberto: notificação local + recarrega A.7 e o A.6
///   daquele chamado;
/// - toque no push abre o A.6; sem sessão, guarda o destino e abre depois
///   do login.
///
/// Falhas de registro nunca bloqueiam o app: tenta de novo na próxima
/// abertura/login.
class PushCoordinator {
  PushCoordinator({
    required PushMessaging messaging,
    required LocalNotifier localNotifier,
    required DeviceTokenRepository tokens,
    required PushPreferences preferences,
    required NotificationsRefreshSignal notificationsSignal,
    required TicketChangedSignal ticketSignal,
    required Future<void> Function(String ticketId) openTicket,
    required Future<bool> Function() confirmPermissionRationale,
  }) : _messaging = messaging,
       _localNotifier = localNotifier,
       _tokens = tokens,
       _preferences = preferences,
       _notificationsSignal = notificationsSignal,
       _ticketSignal = ticketSignal,
       _openTicket = openTicket,
       _confirmRationale = confirmPermissionRationale;

  final PushMessaging _messaging;
  final LocalNotifier _localNotifier;
  final DeviceTokenRepository _tokens;
  final PushPreferences _preferences;
  final NotificationsRefreshSignal _notificationsSignal;
  final TicketChangedSignal _ticketSignal;
  final Future<void> Function(String ticketId) _openTicket;
  final Future<bool> Function() _confirmRationale;

  final List<StreamSubscription<Object?>> _subscriptions = [];
  bool _authenticated = false;
  String? _registeredToken;
  String? _pendingTicketId;

  bool get isAuthenticated => _authenticated;

  /// Chamado do app para o push que ainda aguarda login (testes/diagnóstico).
  String? get pendingTicketId => _pendingTicketId;

  /// Assina os eventos do push e da sessão. Chamar uma vez no início.
  Future<void> start({
    required Stream<SessionState> sessionChanges,
    required SessionState currentSession,
  }) async {
    _subscriptions.add(sessionChanges.listen(_onSession));
    if (!_messaging.isAvailable) {
      await _onSession(currentSession);
      return;
    }

    await _localNotifier.initialize(onTap: _handleTap);
    _subscriptions
      ..add(_messaging.onForegroundMessage.listen(_onForeground))
      ..add(_messaging.onMessageOpenedApp.listen((p) => _handleTap(p.ticketId)))
      ..add(_messaging.onTokenRefresh.listen(_onTokenRefresh));

    final initial = await _messaging.getInitialMessage();
    if (initial != null) _handleTap(initial.ticketId);

    // Sessão já restaurada antes do `start` (ex.: splash rápido).
    await _onSession(currentSession);
  }

  Future<void> _onSession(SessionState state) async {
    final authenticated = state is SessionAuthenticated;
    final becameAuthenticated = authenticated && !_authenticated;
    _authenticated = authenticated;
    if (!authenticated) {
      _registeredToken = null;
      return;
    }
    if (!becameAuthenticated) return;

    final pending = _pendingTicketId;
    if (pending != null) {
      _pendingTicketId = null;
      unawaited(_openTicket(pending));
    }
    await _registerDevice();
  }

  Future<void> _registerDevice() async {
    if (!_messaging.isAvailable) return;
    final platform = _messaging.platform;
    if (platform == null) return;

    if (!await _ensurePermission()) return;
    try {
      final token = await _messaging.getToken();
      if (token == null || !_authenticated) return;
      await _tokens.register(token, platform);
      _registeredToken = token;
    } on AppFailure {
      // Sem rede/API fora: tenta de novo no próximo login/abertura.
    } on Exception {
      // Ex.: APNs ainda sem token no iOS. Idem.
    }
  }

  /// Explica antes do pedido do sistema, só na primeira vez. Se o usuário
  /// recusar a explicação, não pede de novo.
  Future<bool> _ensurePermission() async {
    switch (_preferences.choice) {
      case PushPermissionChoice.declined:
        return false;
      case PushPermissionChoice.accepted:
        // Já decidido no sistema: não mostra prompt de novo.
        return _messaging.requestPermission();
      case PushPermissionChoice.unknown:
        final accepted = await _confirmRationale();
        await _preferences.setChoice(
          accepted
              ? PushPermissionChoice.accepted
              : PushPermissionChoice.declined,
        );
        return accepted && await _messaging.requestPermission();
    }
  }

  Future<void> _onTokenRefresh(String token) async {
    final platform = _messaging.platform;
    if (!_authenticated || platform == null) return;
    try {
      await _tokens.register(token, platform);
      _registeredToken = token;
    } on AppFailure {
      // Registra no próximo login/abertura.
    }
  }

  /// Chamado pelo `SessionCubit` **antes** do `/auth/logout` (a API exige a
  /// sessão para remover o token). Nunca lança.
  Future<void> beforeLogout() async {
    if (!_messaging.isAvailable) return;
    try {
      final token = _registeredToken ?? await _messaging.getToken();
      if (token != null) await _tokens.remove(token);
    } on AppFailure {
      // Sem rede: o logout local segue mesmo assim.
    } on Exception {
      // Idem.
    } finally {
      _registeredToken = null;
    }
  }

  void _onForeground(PushPayload payload) {
    unawaited(_localNotifier.show(payload));
    _notificationsSignal.notify();
    _ticketSignal.notify(payload.ticketId);
  }

  void _handleTap(String ticketId) {
    if (_authenticated) {
      unawaited(_openTicket(ticketId));
    } else {
      // Abre depois do login (ou da restauração da sessão no splash).
      _pendingTicketId = ticketId;
    }
  }

  Future<void> dispose() async {
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    _subscriptions.clear();
  }
}
