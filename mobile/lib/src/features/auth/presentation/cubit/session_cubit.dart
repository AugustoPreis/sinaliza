import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:mobile/src/shared/domain/entities/user.dart';

export 'package:mobile/src/features/auth/presentation/cubit/session_state.dart';

/// Sessão global do app: decide se o usuário vai para o login, para a home
/// ou para a tela de "sem acesso", e reage à expiração vinda da rede.
class SessionCubit extends Cubit<SessionState> {
  SessionCubit({
    required AuthRepository repository,
    required SessionEventBus sessionEvents,
    Future<void> Function()? beforeLogout,
  }) : _repository = repository,
       _sessionEvents = sessionEvents,
       _beforeLogout = beforeLogout,
       super(const SessionUnknown()) {
    _subscription = sessionEvents.events.listen(_onSessionEvent);
  }

  final AuthRepository _repository;
  final SessionEventBus _sessionEvents;

  /// Executado antes do `/auth/logout`, com a sessão ainda válida (ex.:
  /// remover o push token, task 15). Não deve lançar.
  final Future<void> Function()? _beforeLogout;
  late final StreamSubscription<SessionEvent> _subscription;

  static const _activeStatus = 'ACTIVE';

  /// Chamado no splash e no "Tentar novamente".
  Future<void> checkSession() async {
    if (state is! SessionUnknown) emit(const SessionUnknown());

    // Sem cookie de refresh não há o que validar: evita um 401 + refresh
    // inútil (e o aviso de "sessão expirou") na primeira abertura.
    if (!await _repository.hasSession()) {
      emit(const SessionUnauthenticated());
      return;
    }

    try {
      await _applyUser(await _repository.me());
    } on UnauthorizedFailure {
      await _repository.clearSession();
      emit(const SessionUnauthenticated());
    } on NotFoundFailure {
      // Usuário removido no servidor.
      await _repository.clearSession();
      emit(const SessionUnauthenticated());
    } on AppFailure catch (failure) {
      emit(SessionCheckFailed(failure));
    }
  }

  /// Chamado pelo login (task 06) após `POST /auth/login`. O registro do
  /// push token acontece no `PushCoordinator`, que ouve esta mudança.
  Future<void> loggedIn(User user) => _applyUser(user);

  /// Atualiza os dados do usuário (ex.: perfil recarregado) sem navegar.
  void userUpdated(User user) {
    if (state is SessionAuthenticated && user.canUseRequesterApp) {
      emit(SessionAuthenticated(user));
    }
  }

  /// Pull-to-refresh do Perfil: busca `/auth/me` de novo. Devolve a falha
  /// (para a tela avisar) ou `null`. Se a sessão caiu, o refresh da camada
  /// de rede emite `SessionExpired` e o app volta ao login.
  Future<AppFailure?> reloadUser() async {
    if (state is! SessionAuthenticated) return null;
    try {
      final user = await _repository.me();
      if (isClosed || state is! SessionAuthenticated) return null;
      if (user.canUseRequesterApp && user.status == _activeStatus) {
        emit(SessionAuthenticated(user));
      } else {
        // Perdeu a permissão ou foi desativado desde o login.
        await _applyUser(user);
      }
      return null;
    } on AppFailure catch (failure) {
      return failure;
    }
  }

  Future<void> logout() async {
    await _beforeLogout?.call();
    await _repository.logout();
    emit(const SessionUnauthenticated());
  }

  Future<void> _applyUser(User user) async {
    if (user.status.isNotEmpty && user.status != _activeStatus) {
      // Acesso revogado: o access token ainda vale até expirar, mas a conta
      // não está mais ativa.
      await _repository.logout();
      emit(const SessionUnauthenticated(message: AppStrings.sessionExpired));
      return;
    }
    emit(
      user.canUseRequesterApp
          ? SessionAuthenticated(user)
          : SessionNoAccess(user),
    );
  }

  void _onSessionEvent(SessionEvent event) {
    switch (event) {
      case SessionExpired():
        // No splash/login a falha já é tratada por quem fez a chamada.
        if (_isActive(state)) {
          emit(
            const SessionUnauthenticated(message: AppStrings.sessionExpired),
          );
        }
      case SessionEnded():
        break;
    }
  }

  static bool _isActive(SessionState state) =>
      state is SessionAuthenticated || state is SessionNoAccess;

  @override
  void onChange(Change<SessionState> change) {
    super.onChange(change);
    // Avisa os caches (locais, setores, chamados) que a sessão acabou.
    if (_isActive(change.currentState) &&
        change.nextState is SessionUnauthenticated) {
      _sessionEvents.emit(const SessionEnded());
    }
  }

  @override
  Future<void> close() async {
    await _subscription.cancel();
    return super.close();
  }
}
