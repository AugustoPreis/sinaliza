import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';

class LoginState extends Equatable {
  const LoginState({
    this.isSubmitting = false,
    this.identifierError,
    this.passwordError,
    this.errorMessage,
  });

  final bool isSubmitting;
  final String? identifierError;
  final String? passwordError;

  /// Erro geral (credenciais, limite de tentativas, rede).
  final String? errorMessage;

  @override
  List<Object?> get props => [
    isSubmitting,
    identifierError,
    passwordError,
    errorMessage,
  ];
}

/// Tela A.1. Em sucesso entrega o usuário ao [SessionCubit], que navega.
class LoginCubit extends Cubit<LoginState> {
  LoginCubit({
    required AuthRepository repository,
    required SessionCubit session,
  }) : _repository = repository,
       _session = session,
       super(const LoginState());

  final AuthRepository _repository;
  final SessionCubit _session;

  /// Retorna `true` se entrou (a navegação é feita pelo [SessionCubit]).
  Future<bool> submit({
    required String identifier,
    required String password,
  }) async {
    if (state.isSubmitting) return false;

    final login = identifier.trim();
    final identifierError = login.isEmpty
        ? AppStrings.loginIdentifierRequired
        : null;
    final passwordError = password.isEmpty
        ? AppStrings.loginPasswordRequired
        : null;
    if (identifierError != null || passwordError != null) {
      emit(
        LoginState(
          identifierError: identifierError,
          passwordError: passwordError,
        ),
      );
      return false;
    }

    emit(const LoginState(isSubmitting: true));
    try {
      final user = await _repository.login(
        identifier: login,
        password: password,
      );
      await _session.loggedIn(user);
      if (!isClosed) emit(const LoginState());
      return true;
    } on AppFailure catch (failure) {
      if (!isClosed) emit(LoginState(errorMessage: _messageFor(failure)));
      return false;
    }
  }

  /// Limpa o erro do campo quando o usuário volta a digitar.
  void fieldChanged() {
    if (state.identifierError != null ||
        state.passwordError != null ||
        state.errorMessage != null) {
      emit(LoginState(isSubmitting: state.isSubmitting));
    }
  }

  String _messageFor(AppFailure failure) {
    return switch (failure) {
      // Conta inexistente, senha errada ou conta revogada: sempre a mesma
      // mensagem, sem revelar se a conta existe.
      UnauthorizedFailure() => AppStrings.loginInvalidCredentials,
      RateLimitFailure() => AppStrings.loginRateLimited,
      _ => failure.message,
    };
  }
}
